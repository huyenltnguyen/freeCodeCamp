import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Callout } from '@freecodecamp/ui';

import { Link } from '../helpers';

import './index.css';

const ArchivedWarning = () => {
  const { t } = useTranslation();
  return (
    <Callout
      variant='note'
      label={t('callout.note-label')}
      className='archived-warning'
    >
      <Trans i18nKey='learn.archive.content-not-updated'>
        <strong>placeholder</strong>
        <Link to={'/learn/full-stack-developer'}>placeholder</Link>s{' '}
      </Trans>
    </Callout>
  );
};

export default ArchivedWarning;
