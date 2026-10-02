import { useState } from 'react';
import { ArrowUpRight, Check, Copy, Link as LinkIcon, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Ambassador } from '../types';
import { Avatar, githubHandle } from './Avatar';
import { GithubIcon, LinkedinIcon } from './icons';

const withProtocol = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

/** Accepts a full profile URL, "linkedin.com/in/x", or a bare handle. */
function linkedinProfile(value?: string) {
  const v = value?.trim();
  if (!v) return undefined;
  const href = /linkedin\.com/i.test(v) ? withProtocol(v) : `https://www.linkedin.com/in/${v.replace(/^@/, '')}`;
  const label = href
    .replace(/^https?:\/\/([a-z]{2,3}\.)?(www\.)?/i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/$/, '');
  return { href, label };
}

const ROW = 'flex min-w-0 items-center rounded-lg border border-white/[0.07] bg-ink-950/50';
const ROW_LINK = 'flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-cream-200 transition hover:text-cream-50';
const ROW_ACTION =
  'grid h-8 w-8 shrink-0 place-items-center border-l border-white/[0.07] text-cream-400 transition hover:text-cream-50';

export function AmbassadorCard({ person, index }: { person: Ambassador; index: number }) {
  const [copied, setCopied] = useState(false);
  const gh = githubHandle(person.github);

  const copyEmail = async () => {
    if (!person.email) return;
    try {
      await navigator.clipboard.writeText(person.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.location.href = `mailto:${person.email}`;
    }
  };

  const linkedin = linkedinProfile(person.linkedin);
  const links = [
    gh && { href: `https://github.com/${gh}`, label: 'GitHub', icon: <GithubIcon className="h-4 w-4" /> },
    person.website && { href: withProtocol(person.website), label: 'Website', icon: <LinkIcon className="h-4 w-4" /> },
  ].filter(Boolean) as { href: string; label: string; icon: JSX.Element }[];

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.3, ease: [0.2, 0.7, 0.3, 1] }}
      className="group rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.04]"
    >
      <div className="flex items-start gap-3">
        <Avatar person={person} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-cream-50">{person.name}</p>
          {person.role && <p className="truncate text-[13px] text-clay-300">{person.role}</p>}
          {person.field && <p className="truncate text-[13px] text-cream-400">{person.field}</p>}
        </div>
      </div>

      {person.bio && <p className="mt-3 text-[13px] leading-relaxed text-cream-300">{person.bio}</p>}

      {(person.email || linkedin || links.length > 0) && (
        <div className="mt-3 space-y-1.5">
          {person.email && (
            <div className={ROW}>
              <a href={`mailto:${person.email}`} className={ROW_LINK} title={`Email ${person.name}`}>
                <Mail className="h-3.5 w-3.5 shrink-0 text-cream-400" />
                <span className="truncate font-mono text-[12px]">{person.email}</span>
              </a>
              <button
                type="button"
                onClick={copyEmail}
                className={ROW_ACTION}
                aria-label={copied ? 'Email copied' : `Copy ${person.name}'s email`}
                title={copied ? 'Copied!' : 'Copy email'}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#8fb573]" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          {linkedin && (
            <a
              href={linkedin.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${ROW} group/li hover:border-white/20`}
              aria-label={`${person.name} on LinkedIn (opens in a new tab)`}
            >
              <span className={ROW_LINK}>
                <LinkedinIcon className="h-3.5 w-3.5 shrink-0 text-[#6fa8dc]" />
                <span className="truncate font-mono text-[12px]">{linkedin.label}</span>
              </span>
              <span className={`${ROW_ACTION} group-hover/li:text-cream-50`} aria-hidden="true">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </a>
          )}

          {links.length > 0 && (
            <div className="flex gap-1.5 pt-0.5">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${person.name} on ${l.label}`}
                  title={l.label}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.07] bg-ink-950/50 text-cream-300 transition hover:border-white/20 hover:text-cream-50"
                >
                  {l.icon}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.li>
  );
}
