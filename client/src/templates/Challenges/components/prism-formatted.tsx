import React from 'react';
import { PrismFormatted as FccUIPrismFormatted } from '@freecodecamp/ui';
import { useTranslation } from 'react-i18next';

interface PrismFormattedProps {
  className?: string;
  text: string;
  useSpan?: boolean;
  noAria?: boolean;
  hasLineNumbers?: boolean;
  isCollapsible?: boolean;
}

function PrismFormatted({
  className,
  text,
  useSpan,
  noAria,
  hasLineNumbers,
  isCollapsible
}: PrismFormattedProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <FccUIPrismFormatted
      className={className}
      text={text}
      noAria={noAria}
      useSpan={useSpan}
      hasLineNumbers={hasLineNumbers}
      getCodeBlockAriaLabel={codeName =>
        t('aria.code-example', {
          codeName
        })
      }
      {...(isCollapsible
        ? { isCollapsible: true, disclosureLabel: t('learn.example-code') }
        : { isCollapsible: false })}
    />
  );
}

PrismFormatted.displayName = 'PrismFormatted';

export default PrismFormatted;
