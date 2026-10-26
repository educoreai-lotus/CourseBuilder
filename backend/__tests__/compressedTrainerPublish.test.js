import zlib from 'node:zlib';
import {
  COMPRESSED_TRAINER_PUBLISH_ACTION,
  COMPRESSED_TRAINER_PUBLISH_ENCODING,
  COMPRESSED_TRAINER_PUBLISH_REQUESTER,
  COMPRESSED_TRAINER_PUBLISH_TARGET,
  MAX_DECOMPRESSED_TRAINER_COURSE_BYTES,
  decodeCompressedTrainerCourse,
  expandCompressedTrainerPublishIfNeeded,
  isCompressedTrainerPublishRequest
} from '../utils/compressedTrainerPublish.js';

function gzipBase64(obj) {
  return zlib.gzipSync(Buffer.from(JSON.stringify(obj), 'utf8')).toString('base64');
}

const sampleCourse = {
  course_id: '353009a4-3458-44b3-8740-ebb87f4c65d7',
  course_name: 'Full stack & AI',
  course_description: 'Line1\nLine2\tindented',
  course_language: 'en',
  trainer_id: '20000000-0000-0000-0000-000000000001',
  trainer_name: 'Tristan Trainer',
  topics: [
    {
      topic_name: 'Intro',
      topic_description: 'Hello <b>world</b>',
      format_order: ['text_audio', 'code', 'avatar_video'],
      contents: [
        {
          content_type: 'text_audio',
          content_data: {
            text: 'First line\nSecond line\n\tTabbed paragraph'
          }
        },
        {
          content_type: 'code',
          content_data: {
            code: 'function x() {\n\treturn true;\n}'
          }
        },
        {
          content_type: 'avatar_video',
          content_data: {
            fileUrl: 'https://example.com/video.mp4',
            videoUrl: 'https://example.com/video.mp4'
          }
        }
      ],
      devlab_exercises: [
        {
          exercise_id: 'ex-1',
          exercise_name: 'Practice',
          description: 'Use\nmultiline\ninstructions'
        }
      ]
    }
  ]
};

function compressedShell(overrides = {}) {
  return {
    action: COMPRESSED_TRAINER_PUBLISH_ACTION,
    description: 'Send course to Course Builder for publishing',
    targetService: COMPRESSED_TRAINER_PUBLISH_TARGET,
    course_encoding: COMPRESSED_TRAINER_PUBLISH_ENCODING,
    course_compressed: gzipBase64(sampleCourse),
    ...overrides
  };
}

describe('compressedTrainerPublish helper', () => {
  describe('isCompressedTrainerPublishRequest', () => {
    it('matches only the explicit compressed Trainer Publish contract', () => {
      expect(
        isCompressedTrainerPublishRequest(
          COMPRESSED_TRAINER_PUBLISH_REQUESTER,
          compressedShell()
        )
      ).toBe(true);
    });

    it('does not match uncompressed trainer publish', () => {
      expect(
        isCompressedTrainerPublishRequest(COMPRESSED_TRAINER_PUBLISH_REQUESTER, {
          action: COMPRESSED_TRAINER_PUBLISH_ACTION,
          targetService: COMPRESSED_TRAINER_PUBLISH_TARGET,
          trainer_id: sampleCourse.trainer_id,
          course_id: sampleCourse.course_id,
          topics: sampleCourse.topics
        })
      ).toBe(false);
    });

    it('does not match Full AI / Learner AI style payloads', () => {
      expect(
        isCompressedTrainerPublishRequest('course-builder-service', {
          action: 'generate_course_content',
          user_id: 'u1',
          learning_path: {}
        })
      ).toBe(false);
    });

    it('does not match unrelated Content Studio requests', () => {
      expect(
        isCompressedTrainerPublishRequest(COMPRESSED_TRAINER_PUBLISH_REQUESTER, {
          action: 'something else',
          targetService: COMPRESSED_TRAINER_PUBLISH_TARGET,
          course_encoding: COMPRESSED_TRAINER_PUBLISH_ENCODING,
          course_compressed: 'abc'
        })
      ).toBe(false);
    });
  });

  describe('decode + expand', () => {
    it('restores original JSON exactly including multiline text, code indentation, HTML and DevLab', () => {
      const expanded = expandCompressedTrainerPublishIfNeeded(
        COMPRESSED_TRAINER_PUBLISH_REQUESTER,
        compressedShell()
      );

      expect(expanded.course_encoding).toBeUndefined();
      expect(expanded.course_compressed).toBeUndefined();
      expect(expanded.action).toBe(COMPRESSED_TRAINER_PUBLISH_ACTION);
      expect(expanded.targetService).toBe(COMPRESSED_TRAINER_PUBLISH_TARGET);
      expect(expanded.trainer_id).toBe(sampleCourse.trainer_id);
      expect(expanded.course_id).toBe(sampleCourse.course_id);
      expect(expanded.topics).toEqual(sampleCourse.topics);
      expect(expanded.topics[0].contents[0].content_data.text).toBe(
        'First line\nSecond line\n\tTabbed paragraph'
      );
      expect(expanded.topics[0].contents[1].content_data.code).toBe(
        'function x() {\n\treturn true;\n}'
      );
      expect(expanded.topics[0].topic_description).toBe('Hello <b>world</b>');
      expect(expanded.topics[0].devlab_exercises[0].description).toBe(
        'Use\nmultiline\ninstructions'
      );
    });

    it('leaves uncompressed payloads byte-identical by reference', () => {
      const payload = {
        trainer_id: sampleCourse.trainer_id,
        course_id: sampleCourse.course_id,
        topics: sampleCourse.topics
      };
      const result = expandCompressedTrainerPublishIfNeeded(
        COMPRESSED_TRAINER_PUBLISH_REQUESTER,
        payload
      );
      expect(result).toBe(payload);
    });

    it('leaves legacy uncompressed Trainer Publish (identity, no compression fields) by reference', () => {
      const payload = {
        action: COMPRESSED_TRAINER_PUBLISH_ACTION,
        targetService: COMPRESSED_TRAINER_PUBLISH_TARGET,
        trainer_id: sampleCourse.trainer_id,
        course_id: sampleCourse.course_id,
        topics: sampleCourse.topics
      };
      const result = expandCompressedTrainerPublishIfNeeded(
        COMPRESSED_TRAINER_PUBLISH_REQUESTER,
        payload
      );
      expect(result).toBe(payload);
    });

    it('rejects course_encoding gzip+base64 with missing course_compressed', () => {
      const payload = compressedShell();
      delete payload.course_compressed;
      expect(() =>
        expandCompressedTrainerPublishIfNeeded(
          COMPRESSED_TRAINER_PUBLISH_REQUESTER,
          payload
        )
      ).toThrow(/course_compressed/i);
      try {
        expandCompressedTrainerPublishIfNeeded(
          COMPRESSED_TRAINER_PUBLISH_REQUESTER,
          payload
        );
      } catch (err) {
        expect(err.status).toBe(400);
      }
    });

    it('rejects empty course_compressed', () => {
      expect(() =>
        expandCompressedTrainerPublishIfNeeded(
          COMPRESSED_TRAINER_PUBLISH_REQUESTER,
          compressedShell({ course_compressed: '' })
        )
      ).toThrow(/non-empty/i);
    });

    it('rejects non-string course_compressed', () => {
      expect(() =>
        expandCompressedTrainerPublishIfNeeded(
          COMPRESSED_TRAINER_PUBLISH_REQUESTER,
          compressedShell({ course_compressed: { nested: true } })
        )
      ).toThrow(/non-empty Base64 string/i);
    });

    it('rejects unsupported course_encoding', () => {
      expect(() =>
        expandCompressedTrainerPublishIfNeeded(
          COMPRESSED_TRAINER_PUBLISH_REQUESTER,
          compressedShell({ course_encoding: 'deflate+base64' })
        )
      ).toThrow(/Unsupported course_encoding/i);
    });

    it('rejects course_compressed without course_encoding', () => {
      const payload = compressedShell();
      delete payload.course_encoding;
      expect(() =>
        expandCompressedTrainerPublishIfNeeded(
          COMPRESSED_TRAINER_PUBLISH_REQUESTER,
          payload
        )
      ).toThrow(/course_encoding/i);
    });

    it('does not reject Full AI payloads that happen to include compression-looking fields', () => {
      const payload = {
        action: 'generate_course_content',
        course_encoding: 'gzip+base64',
        course_compressed: ''
      };
      const result = expandCompressedTrainerPublishIfNeeded(
        'course-builder-service',
        payload
      );
      expect(result).toBe(payload);
    });

    it('rejects invalid Base64', () => {
      expect(() =>
        decodeCompressedTrainerCourse('!!!not-base64!!!')
      ).toThrow(/Base64/i);
    });

    it('rejects invalid GZIP', () => {
      const notGzip = Buffer.from('hello-not-gzip').toString('base64');
      expect(() => decodeCompressedTrainerCourse(notGzip)).toThrow(/GZIP/i);
    });

    it('enforces decompressed size limit', () => {
      // Highly compressible payload that expands beyond the cap.
      const huge = {
        ...sampleCourse,
        course_description: 'A'.repeat(MAX_DECOMPRESSED_TRAINER_COURSE_BYTES + 1024)
      };
      // Ensure gzip of huge still works but gunzip hits maxOutputLength
      const compressed = zlib
        .gzipSync(Buffer.from(JSON.stringify(huge), 'utf8'))
        .toString('base64');

      expect(() => decodeCompressedTrainerCourse(compressed)).toThrow(
        /maximum decompressed size/i
      );
    });

    it('rejects missing trainer_id', () => {
      const bad = { ...sampleCourse, trainer_id: '' };
      expect(() => decodeCompressedTrainerCourse(gzipBase64(bad))).toThrow(
        /trainer_id/i
      );
    });

    it('rejects missing course_id', () => {
      const { course_id, ...rest } = sampleCourse;
      expect(() => decodeCompressedTrainerCourse(gzipBase64(rest))).toThrow(
        /course_id/i
      );
    });

    it('rejects missing topics', () => {
      const bad = { ...sampleCourse, topics: [] };
      expect(() => decodeCompressedTrainerCourse(gzipBase64(bad))).toThrow(
        /topics/i
      );
    });

    it('rejects topics without contents array', () => {
      const bad = {
        ...sampleCourse,
        topics: [{ topic_name: 'X', format_order: [] }]
      };
      expect(() => decodeCompressedTrainerCourse(gzipBase64(bad))).toThrow(
        /contents/i
      );
    });

    it('attaches HTTP 400 status on validation failures for controller mapping', () => {
      try {
        decodeCompressedTrainerCourse('!!!bad!!!');
        throw new Error('expected throw');
      } catch (err) {
        expect(err.status).toBe(400);
      }
    });

    it('expanded payload includes topics so ContentStudio routing can detect trainer publish', () => {
      const expanded = expandCompressedTrainerPublishIfNeeded(
        COMPRESSED_TRAINER_PUBLISH_REQUESTER,
        compressedShell()
      );
      // Mirrors inferSpecializedServiceFromPayload ContentStudio detection
      expect(Array.isArray(expanded.topics)).toBe(true);
      expect(expanded.topics.length).toBeGreaterThan(0);
      // Mirrors trainer branch detection
      expect(Boolean(expanded.trainer_id)).toBe(true);
    });
  });
});

describe('controller wiring (source contract)', () => {
  it('integration.controller imports and can call expand helper', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const src = fs.readFileSync(
      path.join(dir, '../controllers/integration.controller.js'),
      'utf8'
    );
    expect(src).toContain('expandCompressedTrainerPublishIfNeeded');
    expect(src).toContain('compressedTrainerPublish.js');
    // Must run before target-service determination
    const expandIdx = src.indexOf('expandCompressedTrainerPublishIfNeeded');
    const determineIdx = src.indexOf('determineTargetService(payloadObject');
    expect(expandIdx).toBeGreaterThan(-1);
    expect(determineIdx).toBeGreaterThan(expandIdx);
  });
});
