import React from 'react';
import { Info } from 'lucide-react';
import { CurrencyCode } from '../types';
import { useT } from '../i18n/useTranslation';
import { EXCHANGE_RATES_LAST_REVIEWED, PRICES_LAST_REVIEWED } from '../data/pricing';

/**
 * A short, honest line under any section that shows the app's own prices:
 * they are estimates, not live shop prices. Mentions the exchange rate too
 * when the person has chosen a currency other than rand.
 */
export const PriceNote: React.FC<{ currency?: CurrencyCode; className?: string }> = ({
  currency = 'ZAR',
  className = '',
}) => {
  const t = useT();
  return (
    <p className={`flex items-start gap-1.5 text-[11px] leading-relaxed text-[#7b8370] ${className}`}>
      <Info className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
      <span>
        {t('Prices are estimates, not live shop prices. They vary by shop, area and season.')}
        {PRICES_LAST_REVIEWED && (
          <>
            {' '}
            {t('Last checked')}: {PRICES_LAST_REVIEWED}.
          </>
        )}
        {currency !== 'ZAR' && (
          <>
            {' '}
            {t('Converted from rand at a fixed, approximate exchange rate.')}
            {EXCHANGE_RATES_LAST_REVIEWED && ` (${EXCHANGE_RATES_LAST_REVIEWED})`}
          </>
        )}
      </span>
    </p>
  );
};
