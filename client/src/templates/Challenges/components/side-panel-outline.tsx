import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, CloseButton, Spacer } from '@freecodecamp/ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faListUl } from '@fortawesome/free-solid-svg-icons';
import {
  buildOutline,
  type OutlineHeading,
  type ProcessedHeading
} from '../utils/challenge-description-processor';
import PrismFormatted from './prism-formatted';
import './side-panel-outline.css';

interface Props {
  headings: ProcessedHeading[];
}

const renderOutline = (
  nodes: OutlineHeading[],
  onLinkClick: (id: string) => void
): JSX.Element[] => {
  return nodes.map(node => (
    <li key={node.id} className={`outline-item level-${node.level}`}>
      <a
        href={`#${node.id}`}
        onClick={e => {
          e.preventDefault();
          onLinkClick(node.id);
        }}
      >
        <PrismFormatted useSpan={true} noAria={true} text={node.text} />
      </a>
      {node.children.length > 0 && (
        <ul className='outline-list'>
          {renderOutline(node.children, onLinkClick)}
        </ul>
      )}
    </li>
  ));
};

const SidePanelOutline = ({ headings }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  const outline = useMemo(() => buildOutline(headings), [headings]);

  const onLinkClick = (id: string) => {
    const element = document.getElementById(id);

    if (element) {
      let offset = 0;

      // Find and measure the header element
      const header = document.querySelector('.site-header');
      if (header) {
        offset += header.getBoundingClientRect().height;
      }

      // Find and measure the breadcrumbs element
      const breadcrumbs = document.querySelector('.breadcrumbs-demo');
      if (breadcrumbs) {
        offset += breadcrumbs.getBoundingClientRect().height;
      }

      const elementTop = element.offsetTop - offset;
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      window.scrollTo({
        top: elementTop,
        behavior: prefersReduced ? 'auto' : 'smooth'
      });

      // Move focus to the target heading
      element.focus();
    }
  };

  useEffect(() => {
    if (open) {
      // Focus the panel when opened
      if (panelRef.current) {
        panelRef.current.focus();
      }
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setOpen(false);
          // return focus to trigger after closing
          if (triggerRef.current) {
            triggerRef.current.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open]);

  if (!open) {
    return (
      <Button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        aria-label={t('aria.open-content-outline-panel')}
        aria-controls='side-panel-outline'
        aria-expanded={open}
        className='side-panel-collapsed'
      >
        <FontAwesomeIcon icon={faListUl} />
      </Button>
    );
  }

  return (
    <aside
      id='side-panel-outline'
      ref={el => {
        panelRef.current = el;
      }}
      tabIndex={-1}
    >
      <div className='side-panel-header'>
        <h2>{t('learn.content-outline')}</h2>

        <CloseButton
          onClick={() => setOpen(false)}
          label={t('buttons.close')}
        />
      </div>
      <Spacer size='s' />
      <nav className='side-panel-nav'>
        <ul className='outline-list'>{renderOutline(outline, onLinkClick)}</ul>
      </nav>
    </aside>
  );
};

SidePanelOutline.displayName = 'SidePanelOutline';

export default SidePanelOutline;
