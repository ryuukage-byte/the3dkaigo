/**
 * LockerInteractionModal.tsx
 * Interactive changing clothes UI & locker action modal.
 * Triggered when approaching the locker in the Locker Room (更衣室).
 * Supports keyboard [E] and mobile tap interaction.
 */

import React, { useState } from 'react';
import { Game } from '../core/Game.ts';
import { OutfitConfig, OUTFIT_PRESETS } from '../player/PlayerAvatar.ts';
import { Shirt, Check, X, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';

interface LockerInteractionModalProps {
  game: Game;
  isNearLocker: boolean;
  isLockerOpen: boolean;
  isModalOpen: boolean;
  currentOutfit: OutfitConfig;
}

export const LockerInteractionModal: React.FC<LockerInteractionModalProps> = ({
  game,
  isNearLocker,
  isLockerOpen,
  isModalOpen,
  currentOutfit,
}) => {
  const [justChanged, setJustChanged] = useState<string | null>(null);

  const handleSelectOutfit = (outfitId: string) => {
    game.changeOutfit(outfitId);
    // Directly close menu and cleanly restore FPS mode
    game.closeLockerModal();
  };

  return (
    <>
      {/* 1. Contextual Floating Action Prompt when near locker (only if not directly raycasting) */}
      {isNearLocker && !isModalOpen && !game.activeInteraction && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30 animate-bounce">
          <button
            onClick={() => game.openOutfitMenu()}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-neutral-900/95 hover:bg-neutral-800 text-white border-2 border-sky-400 shadow-2xl backdrop-blur-md transition-all active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Shirt className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-sky-500/30 text-sky-300 font-mono text-xs font-bold">
                  [E]
                </span>
                <span className="text-sm font-bold tracking-wide">
                  更衣ロッカーを開けて着替える
                </span>
              </div>
              <span className="text-[11px] text-neutral-400 block">
                Open Locker #04 to change shift clothes
              </span>
            </div>
          </button>
        </div>
      )}

      {/* 2. Changing Clothes Wardrobe Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
          style={{ cursor: 'default' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              game.closeLockerModal();
            }
          }}
        >
          <div
            className="bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: 'default' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400">
                  <Shirt className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white tracking-wide">
                      スタッフ更衣ロッカー #04
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                      山田 介護職員
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">
                    STAFF LOCKER #04 — 本日の担当業務に合わせてユニフォーム・私服を着替えます
                  </p>
                </div>
              </div>
              <button
                onClick={() => game.closeLockerModal()}
                className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Currently Equipped Banner */}
            <div className="px-6 py-2.5 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-neutral-300">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>現在の着用服装:</span>
                <span className="font-bold text-white bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                  {currentOutfit.nameJa}
                </span>
                <span className="text-neutral-400 text-[11px] font-mono">({currentOutfit.nameEn})</span>
              </div>
              {justChanged && (
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>着替え完了！</span>
                </div>
              )}
            </div>

            {/* Outfit Selection Grid */}
            <div className="p-6 overflow-y-auto flex flex-col gap-3">
              {OUTFIT_PRESETS.map((outfit) => {
                const isSelected = currentOutfit.id === outfit.id;
                const hexColor = `#${outfit.shirtColor.toString(16).padStart(6, '0')}`;
                const pantsHex = `#${outfit.pantsColor.toString(16).padStart(6, '0')}`;

                return (
                  <div
                    key={outfit.id}
                    onClick={() => handleSelectOutfit(outfit.id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-400 shadow-md shadow-sky-500/10'
                        : 'bg-neutral-950/40 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Outfit Color Swatches */}
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-8 h-8 rounded-lg shadow-inner border border-white/20 flex items-center justify-center text-white"
                          style={{ backgroundColor: hexColor }}
                          title="Shirt Color"
                        >
                          <Shirt className="w-4 h-4 drop-shadow" />
                        </div>
                        <div
                          className="w-6 h-3 rounded-sm border border-white/10"
                          style={{ backgroundColor: pantsHex }}
                          title="Pants Color"
                        />
                      </div>

                      {/* Text info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${isSelected ? 'text-sky-300' : 'text-white'}`}>
                            {outfit.nameJa}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {outfit.nameEn}
                          </span>
                          {outfit.badgeVisible && (
                            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                              <ShieldCheck className="w-2.5 h-2.5 text-sky-400" />
                              名札着用
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {outfit.descriptionJa}
                        </p>
                      </div>
                    </div>

                    {/* Action Button / State */}
                    <div>
                      {isSelected ? (
                        <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 font-semibold text-xs border border-sky-500/40">
                          <Check className="w-4 h-4" />
                          着用中
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectOutfit(outfit.id);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
                        >
                          着替える
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between text-xs text-neutral-400">
              <span>💡 服装を選択すると3Dアバターのユニフォームがリアルタイムに変更されます</span>
              <button
                onClick={() => game.closeLockerModal()}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium transition-colors"
              >
                ロッカーを閉じる (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
