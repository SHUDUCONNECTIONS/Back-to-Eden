import React from 'react';
import { PRIVACY_POLICY, PRIVACY_POLICY_UPDATED } from '../content/privacyPolicy';

/**
 * The privacy policy text. Used inside the sign-in card, the consent screen
 * and the Account & privacy page. English only for now: a legal text should be
 * translated by a person, not by machine.
 */
export const PrivacyPolicy: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className={`text-[#3e5531] ${compact ? 'text-[12px]' : 'text-sm'} leading-relaxed space-y-4`}>
    <p className="text-[11px] text-[#7b8370]">Last updated {PRIVACY_POLICY_UPDATED}</p>
    {PRIVACY_POLICY.map((section) => (
      <section key={section.heading} className="space-y-1.5">
        <h3 className={`font-bold text-[#2f4026] ${compact ? 'text-[13px]' : 'text-base'}`}>
          {section.heading}
        </h3>
        {section.paragraphs?.map((p) => <p key={p}>{p}</p>)}
        {section.bullets && (
          <ul className="list-disc pl-5 space-y-1">
            {section.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
      </section>
    ))}
  </div>
);
