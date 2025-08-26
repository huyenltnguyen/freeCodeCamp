import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, CloseButton, Spacer } from '@freecodecamp/ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faListUl } from '@fortawesome/free-solid-svg-icons';
import { ProcessedHeading } from '../utils/heading-processor';
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

  const outline = useMemo(() => buildOutline(headings), [headings]);

  const onLinkClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!open) {
    return (
      <div className='side-panel-collapsed'>
        <Button
          onClick={() => setOpen(true)}
          aria-label={t('aria.content-outline')}
        >
          <FontAwesomeIcon icon={faListUl} />
        </Button>
      </div>
    );
  }

  return (
    <aside className='side-panel-outline'>
      <div className='side-panel-header'>
        <h2>{t('aria.content-outline')}</h2>

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
