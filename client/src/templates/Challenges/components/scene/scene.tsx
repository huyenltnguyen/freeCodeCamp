import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback
} from 'react';
import { Col, Spacer } from '@freecodecamp/ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCirclePause, faCirclePlay } from '@fortawesome/free-solid-svg-icons';
import { isEmpty } from 'lodash-es';
import { useTranslation } from 'react-i18next';
import { FullScene } from '../../../../redux/prop-types';
import { Loader } from '../../../../components/helpers';
import ClosedCaptionsIcon from '../../../../assets/icons/closedcaptions';
import ChallengeTranscript from '../challenge-transcript';
import { getChallengeContentLangProps } from '../../../../utils/challenge-content-lang';
import { sounds, backgrounds, characterAssets } from './scene-assets';
import Character from './character';
import { SceneSubject } from './scene-subject';
import { advanceSceneTime, buildTranscript } from './scene-helpers';

import './scene.css';

const sToMs = (n: number) => n * 1000;

const loadImage = (src: string | null) => {
  if (src) new Image().src = src;
};

const initDialogue = { label: '', text: '', align: 'left' };

export function Scene({
  scene,
  sceneSubject,
  superBlock
}: {
  scene: FullScene;
  sceneSubject: SceneSubject;
  superBlock?: string;
}): JSX.Element {
  const { t } = useTranslation();
  const { setup, commands } = scene;
  const { audio, alwaysShowDialogue } = setup;

  const audioRef = useRef<HTMLAudioElement>(new Audio());
  // true from the moment play() is requested until the audio is paused
  const audioIsActiveRef = useRef(false);
  // true once the segment has played to its end in the current run
  const audioIsDoneRef = useRef(false);

  const audioStart = sToMs(audio.startTime);
  const segmentStart = audio.startTimestamp ?? 0;

  // if there are timestamps, we use the difference between them as the duration
  // if not, we assume we're playing the whole audio file.
  const duration =
    audio.startTimestamp !== null && audio.finishTimestamp !== null
      ? sToMs(audio.finishTimestamp - audio.startTimestamp)
      : Infinity;

  const getSegmentDuration = useCallback(
    () =>
      duration === Infinity
        ? sToMs(audioRef.current.duration - segmentStart)
        : duration,
    [duration, segmentStart]
  );

  // How much of the segment has been played, in ms. This only advances while
  // the audio is audibly playing, so it stands still during buffering.
  const getAudioOffset = useCallback(() => {
    const { ended, currentTime } = audioRef.current;
    return audioIsDoneRef.current || ended
      ? getSegmentDuration()
      : sToMs(currentTime - segmentStart);
  }, [getSegmentDuration, segmentStart]);

  const startAudio = () => {
    audioIsActiveRef.current = true;
    // play() rejects when pause() interrupts it or when the browser blocks
    // playback. The next click on the play button retries.
    void audioRef.current.play().catch(() => undefined);
  };

  const pauseAudio = useCallback(() => {
    audioRef.current.pause();
    audioIsActiveRef.current = false;
  }, []);

  const pauseAnimation = () => {
    setIsPlaying(false);
    // @ts-expect-error cancelAnimationFrame accepts undefined, but TS doesn't
    // know that
    window.cancelAnimationFrame(animationRef.current);
  };

  const resetAudio = useCallback(() => {
    pauseAudio();
    audioRef.current.currentTime = segmentStart;
  }, [pauseAudio, segmentStart]);

  const finishAudioAtSegmentEnd = useCallback(() => {
    if (audioIsActiveRef.current && getAudioOffset() >= getSegmentDuration()) {
      resetAudio();
      audioIsDoneRef.current = true;
    }
  }, [getAudioOffset, getSegmentDuration, resetAudio]);

  // on mount
  useEffect(() => {
    const { current } = audioRef;
    const { audio } = setup;

    if (current) {
      const audioTimestamp =
        duration !== Infinity ? `#t=${audio.startTimestamp}` : '';
      current.volume = 1;
      current.addEventListener('canplaythrough', audioLoaded);
      // The animation frames that normally end the segment stop in background
      // tabs, while timeupdate keeps firing.
      current.addEventListener('timeupdate', finishAudioAtSegmentEnd);
      current.src = `${sounds}/${audio.filename}${audioTimestamp}`;
      current.preload = 'auto';
      current.load();
    }

    // preload images
    loadImage(`${backgrounds}/${setup.background}`);

    setup.characters
      .map(({ character }) => Object.values(characterAssets[character]))
      .flat()
      .forEach(loadImage);

    commands
      .map(({ background }) =>
        background ? `${backgrounds}/${background}` : null
      )
      .forEach(loadImage);

    // on unmount
    return () => {
      resetAudio();
      current.removeEventListener('canplaythrough', audioLoaded);
      current.removeEventListener('timeupdate', finishAudioAtSegmentEnd);
    };
  }, [duration, setup, commands, resetAudio, finishAudioAtSegmentEnd]);

  const initBackground = setup.background;

  // The characters are memoized to prevent the useEffect from running on every
  // render,
  const initCharacters = useMemo(
    () =>
      setup.characters.map(character => {
        return {
          ...character,
          opacity: character.opacity ?? 1,
          isTalking: false
        };
      }),
    [setup.characters]
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [sceneIsReady, setSceneIsReady] = useState(false);
  const [accessibilityOn, setAccessibilityOn] = useState(false);
  const [characters, setCharacters] = useState(initCharacters);
  const [dialogue, setDialogue] = useState(initDialogue);
  const [background, setBackground] = useState(initBackground);
  const sceneTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const animationRef = useRef<number>();
  const usedCommandsRef = useRef(new Set<number>());

  const [currentTime, setCurrentTime] = useState(0);
  // TODO: I'm using a ref so that the maybeStopAudio closure doesn't get stuck
  // with the initial value of isPlaying. Given that we also have a state,
  // isPlaying, it feels like there's a better way.
  const isPlayingSceneRef = useRef(false);

  // memoizing to prevent the useEffect from running on every render
  const sortedCommands = useMemo(() => {
    const normalized = commands.flatMap(command => {
      const { startTime, finishTime, ...rest } = command;

      const startCommand = {
        ...rest,
        time: sToMs(startTime),
        isTalking: !!rest.dialogue
      };
      const finishCommand = finishTime
        ? { ...rest, time: sToMs(finishTime), isTalking: false }
        : null;

      return finishCommand ? [startCommand, finishCommand] : [startCommand];
    });
    normalized.sort((a, b) => a.time - b.time);
    return normalized;
  }, [commands]);

  // an extra 500ms at the end to let the characters fade out (CSS transition
  const resetTime = sortedCommands.at(-1)!.time + 500;

  const audioLoaded = () => {
    setSceneIsReady(true);
  };

  const handlePlay = useCallback(() => {
    // The audio is the master clock: while it plays, the scene time follows
    // the audio position, so the animation waits whenever the audio buffers.
    const updateCurrentTime = (frameTime: number) => {
      if (!isPlayingSceneRef.current) {
        return;
      }
      const elapsed = Math.max(0, frameTime - lastFrameTimeRef.current);
      lastFrameTimeRef.current = frameTime;

      finishAudioAtSegmentEnd();

      const audioEnd = audioStart + getSegmentDuration();
      const sceneTime = advanceSceneTime({
        sceneTime: sceneTimeRef.current,
        elapsed,
        audioStart,
        audioEnd,
        audioOffset: getAudioOffset()
      });
      sceneTimeRef.current = sceneTime;
      setCurrentTime(sceneTime);

      if (
        sceneTime >= audioStart &&
        sceneTime < audioEnd &&
        !audioIsActiveRef.current
      ) {
        startAudio();
      }

      animationRef.current = window.requestAnimationFrame(updateCurrentTime);
    };
    // TODO: if we manage the playing state in another module, we should not
    // need the early return here. It should not be possible for this to be
    // called at all if the scene is already playing.
    if (isPlaying || !sceneIsReady) return;
    setIsPlaying(true);
    isPlayingSceneRef.current = true;

    lastFrameTimeRef.current = performance.now();
    animationRef.current = window.requestAnimationFrame(updateCurrentTime);
  }, [
    audioStart,
    finishAudioAtSegmentEnd,
    getAudioOffset,
    getSegmentDuration,
    isPlaying,
    sceneIsReady
  ]);

  const handlePause = useCallback(() => {
    isPlayingSceneRef.current = false;
    pauseAudio();
    pauseAnimation();
  }, [pauseAudio]);

  const handleStop = useCallback(() => {
    usedCommandsRef.current.clear();
    resetAudio();
    pauseAnimation();
    audioIsDoneRef.current = false;
    sceneTimeRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(false);
    isPlayingSceneRef.current = false;
    setDialogue(initDialogue);
    setCharacters(initCharacters);
    setBackground(initBackground);
  }, [resetAudio, initCharacters, initBackground]);

  const resetAnimation = useCallback(() => {
    usedCommandsRef.current.clear();
    sceneTimeRef.current = 0;
    setCurrentTime(0);
    setDialogue(initDialogue);
    setCharacters(initCharacters);
    setBackground(initBackground);
  }, [initCharacters, initBackground]);

  const resetScene = () => {
    setIsPlaying(false);
    isPlayingSceneRef.current = false;
    audioIsDoneRef.current = false;
  };

  const onNotify = useCallback(
    (eventType: 'play' | 'pause' | 'stop') => {
      if (eventType === 'play') {
        handlePlay();
      } else if (eventType === 'pause') {
        handlePause();
      } else {
        handleStop();
      }
    },
    [handlePlay, handlePause, handleStop]
  );

  useEffect(() => {
    sceneSubject.attach(onNotify);
    return () => {
      sceneSubject.detach(onNotify);
    };
  }, [onNotify, sceneSubject]);

  useEffect(() => {
    if (isEmpty(sortedCommands)) return;

    sortedCommands.forEach((command, commandIndex) => {
      // Start command timeout
      if (
        currentTime > command.time &&
        !usedCommandsRef.current.has(commandIndex)
      ) {
        usedCommandsRef.current.add(commandIndex);
        if (command.background) setBackground(command.background);

        setDialogue(
          command.dialogue
            ? { ...command.dialogue, label: command.character }
            : initDialogue
        );

        setCharacters(prevCharacters => {
          const newCharacters = prevCharacters.map(character => {
            if (character.character === command.character) {
              return {
                ...character,
                position: command.position ?? character.position,
                opacity: command.opacity ?? character.opacity,
                isTalking: command.isTalking
              };
            }
            return character;
          });
          return newCharacters;
        });
      }
    });

    // The scene outlasts the audio, so a segment that runs past the last
    // command still plays in full.
    const sceneEnd = Math.max(resetTime, audioStart + getSegmentDuration());

    if (currentTime >= sceneEnd) {
      // resetAnimation only works if called AFTER the commands, otherwise the
      // commands will undo the reset.
      resetAnimation();
      resetScene();
    }
  }, [
    currentTime,
    resetTime,
    sortedCommands,
    resetAnimation,
    audioStart,
    getSegmentDuration
  ]);

  useEffect(() => {
    return () => {
      // @ts-expect-error cancelAnimationFrame accepts undefined, but TS doesn't
      // know that
      window.cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const transcriptText = buildTranscript(commands);
  return (
    <Col lg={10} lgOffset={1} md={10} mdOffset={1}>
      <div
        className='scene-wrapper'
        style={{
          backgroundImage: `url("${backgrounds}/${background}")`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          aspectRatio: '16 / 9'
        }}
      >
        {!sceneIsReady ? (
          <Loader />
        ) : (
          <>
            {characters.map(
              (
                { character, position = {}, opacity = 1, isTalking = false },
                i
              ) => {
                return (
                  <Character
                    key={i}
                    name={character}
                    position={position}
                    opacity={opacity}
                    isTalking={isPlaying && isTalking}
                    sceneSubject={sceneSubject}
                  />
                );
              }
            )}

            {(alwaysShowDialogue || accessibilityOn) && (
              <div
                className={`scene-dialogue-wrap ${
                  dialogue.align ? `scene-dialogue-align-${dialogue.align}` : ''
                }`}
              >
                <div className='scene-dialogue-label'>{dialogue.label}</div>
                <div
                  className='scene-dialogue-text'
                  dangerouslySetInnerHTML={{ __html: dialogue.text }}
                  {...getChallengeContentLangProps(superBlock)}
                />
              </div>
            )}
          </>
        )}
      </div>
      <div className='scene-controls'>
        <button
          className='scene-btn scene-play-btn'
          onClick={() => sceneSubject.notify(isPlaying ? 'pause' : 'play')}
        >
          {isPlaying ? (
            <>
              <span className='sr-only'>{t('buttons.pause')}</span>
              <FontAwesomeIcon icon={faCirclePause} size='3x' />
            </>
          ) : (
            <>
              <span className='sr-only'>{t('buttons.play')}</span>
              <FontAwesomeIcon icon={faCirclePlay} size='3x' />
            </>
          )}
        </button>

        {alwaysShowDialogue ? (
          <div className='scene-a11y-btn'></div>
        ) : (
          <button
            className='scene-btn scene-a11y-btn'
            aria-label={t('buttons.closed-caption')}
            aria-pressed={accessibilityOn}
            onClick={() => setAccessibilityOn(!accessibilityOn)}
          >
            <ClosedCaptionsIcon
              fill={
                accessibilityOn ? 'var(--tertiary-color)' : 'var(--gray-45)'
              }
            />
          </button>
        )}
      </div>
      <ChallengeTranscript
        transcript={transcriptText}
        isDialogue={true}
        superBlock={superBlock}
      />
      <Spacer size='m' />
    </Col>
  );
}

Scene.displayName = 'Scene';

export default Scene;
