import { Type } from '@fastify/type-provider-typebox';
import { genericError } from '../types';

export const curriculumSectionCompleted = {
  body: Type.Union([
    Type.Object({
      blockId: Type.String(),
      moduleId: Type.Optional(Type.String()),
      chapterId: Type.Optional(Type.String())
    }),
    Type.Object({
      blockId: Type.Optional(Type.String()),
      moduleId: Type.String(),
      chapterId: Type.Optional(Type.String())
    }),
    Type.Object({
      blockId: Type.Optional(Type.String()),
      moduleId: Type.Optional(Type.String()),
      chapterId: Type.String()
    })
  ]),
  response: {
    200: Type.Object({
      block: Type.Union([
        Type.Null(),
        Type.Object({
          id: Type.String(),
          alreadyCompleted: Type.Boolean(),
          completedDate: Type.Number()
        })
      ]),
      module: Type.Union([
        Type.Null(),
        Type.Object({
          id: Type.String(),
          alreadyCompleted: Type.Boolean(),
          completedDate: Type.Number()
        })
      ]),
      chapter: Type.Union([
        Type.Null(),
        Type.Object({
          id: Type.String(),
          alreadyCompleted: Type.Boolean(),
          completedDate: Type.Number()
        })
      ])
    }),
    400: Type.Object({
      type: Type.Literal('error'),
      message: Type.Literal(
        'That does not appear to be a valid curriculum section submission.'
      )
    }),
    default: genericError
  }
};
