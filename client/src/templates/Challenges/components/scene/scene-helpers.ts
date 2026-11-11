import { type SceneCommand } from '../../../../redux/prop-types';

export const buildTranscript = (commands: SceneCommand[]): string => {
  let transcriptText = '';
  commands.forEach(command => {
    if (command.character && command.dialogue && command.startTime) {
      transcriptText =
        transcriptText +
        '<p><b>' +
        command.character +
        '</b>: ' +
        command.dialogue.text +
        '</p>';
    }
  });

  return transcriptText;
};

interface SceneClock {
  sceneTime: number;
  elapsed: number;
  audioStart: number;
  audioEnd: number;
  audioOffset: number;
}

// All values are in ms. audioOffset is how much of the audio segment has been
// played. Inside the audio window the scene follows the audio, so the scene
// holds still while the audio buffers. Outside of it the wall clock drives the
// scene.
export const advanceSceneTime = ({
  sceneTime,
  elapsed,
  audioStart,
  audioEnd,
  audioOffset
}: SceneClock): number => {
  if (sceneTime < audioStart) {
    return Math.min(sceneTime + elapsed, audioStart);
  }
  if (sceneTime < audioEnd) {
    return Math.max(sceneTime, Math.min(audioStart + audioOffset, audioEnd));
  }
  return sceneTime + elapsed;
};
