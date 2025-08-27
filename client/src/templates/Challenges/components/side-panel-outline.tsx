import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, CloseButton, Spacer } from '@freecodecamp/ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faListUl } from '@fortawesome/free-solid-svg-icons';
import { ProcessedHeading } from '../utils/challenge-description-processor';
import PrismFormatted from './prism-formatted';
import './side-panel-outline.css';

type Heading = {
  id: string;
  text: string;
  level: number;
  children: Heading[];
};

type Props = {
  headings: ProcessedHeading[];
};

const buildOutline = (headings: ProcessedHeading[]): Heading[] => {
  const root: Heading[] = [];
  const stack: Heading[] = [];

  headings.forEach(({ text, level, id }) => {
    const node: Heading = { id, text, level, children: [] };

    while (stack.length > 0 && level <= stack[stack.length - 1].level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  });

  return root;
};

const renderOutline = (
  nodes: Heading[],
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
      window.scrollTo({
        top: elementTop,
        behavior: 'smooth'
      });
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
      aria-hidden={!open}
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
