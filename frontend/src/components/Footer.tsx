import React from 'react';
import { Heart, ArrowUp } from 'lucide-react';
import { Logo } from './Logo';
import { useT } from '../i18n/useTranslation';

interface FooterProps {
  onScrollToTop: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onScrollToTop }) => {
  const t = useT();

  return (
    <footer className="bg-[#f7eedd] border-t border-[#e9dfc8] py-12 px-4 sm:px-8 text-xs text-[#67795a]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex justify-center md:justify-start">
            <Logo className="h-14 w-auto" />
          </div>
          <p className="text-[#627f50]">
            {t('Healthy living, grounded in real life. Balanced nutrition, realistic budgets, and zero food waste.')}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-[11px] text-[#7b8370]">
            {t('Prices are estimates and vary by shop')}
          </span>
          <button
            onClick={onScrollToTop}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#4e6b3e] hover:text-[#23301b] transition-colors cursor-pointer"
          >
            <span>{t('Back to top')}</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
