import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const MAX_TEXT_CHARS = 30_000;
const MAX_BASE64_CHARS = 11 * 1024 * 1024; // ~8 MB raw binary

type AllowedFormat = 'multiple_choice' | 'open' | 'mixed';
type AllowedDifficulty = 'basic' | 'medium' | 'advanced';

interface GenerateQuestionsPayload {
  lessonText?: unknown;
  fileData?: {
    mimeType?: unknown;
    base64?: unknown;
    fileName?: unknown;
  } | null;
  className?: unknown;
  subject?: unknown;
  setTitle?: unknown;
  questionCount?: unknown;
  questionFormat?: unknown;
  difficulty?: unknown;
}

interface GeneratedQuestionRaw {
  type?: string;
  prompt?: string;
  options?: string[];
  correctOptionIndex?: number;
  answerText?: string;
}

interface GeneratedSetRaw {
  title?: string;
  subject?: string;
  questions?: GeneratedQuestionRaw[];
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  // Server-side Gemini endpoint for generating classroom question sets from lesson content
  app.post('/api/generate-questions', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Vui lòng kiểm tra mục Settings > Secrets.',
      });
      return;
    }

    const body = (req.body || {}) as GenerateQuestionsPayload;

    const lessonText =
      typeof body.lessonText === 'string' ? body.lessonText.trim() : '';
    const className =
      typeof body.className === 'string'
        ? body.className.trim().slice(0, 80)
        : 'Học sinh Tiểu học / THCS';
    const subject =
      typeof body.subject === 'string' ? body.subject.trim().slice(0, 80) : '';
    const requestedTitle =
      typeof body.setTitle === 'string' ? body.setTitle.trim().slice(0, 120) : '';

    const rawCount = Number(body.questionCount);
    const questionCount = Number.isFinite(rawCount)
      ? Math.max(1, Math.min(20, Math.round(rawCount)))
      : 6;

    const questionFormat: AllowedFormat =
      body.questionFormat === 'multiple_choice' ||
      body.questionFormat === 'open' ||
      body.questionFormat === 'mixed'
        ? body.questionFormat
        : 'mixed';

    const difficulty: AllowedDifficulty =
      body.difficulty === 'basic' ||
      body.difficulty === 'medium' ||
      body.difficulty === 'advanced'
        ? body.difficulty
        : 'medium';

    let validatedFile: { mimeType: string; base64: string; fileName: string } | null =
      null;

    if (body.fileData && typeof body.fileData === 'object') {
      const mimeType =
        typeof body.fileData.mimeType === 'string'
          ? body.fileData.mimeType.trim().toLowerCase()
          : '';
      const base64 =
        typeof body.fileData.base64 === 'string'
          ? body.fileData.base64.trim()
          : '';
      const fileName =
        typeof body.fileData.fileName === 'string'
          ? body.fileData.fileName.trim().slice(0, 120)
          : 'tai-lieu-bai-day';

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        res.status(400).json({
          error:
            'Định dạng tệp chưa hỗ trợ. Vui lòng tải lên tệp PDF, ảnh (PNG/JPG/WEBP) hoặc tệp văn bản (.txt/.md).',
        });
        return;
      }
      if (!base64 || base64.length > MAX_BASE64_CHARS) {
        res.status(400).json({
          error: 'Tệp tải lên vượt quá dung lượng tối đa 8MB.',
        });
        return;
      }
      validatedFile = { mimeType, base64, fileName };
    }

    if (!lessonText && !validatedFile) {
      res.status(400).json({
        error:
          'Vui lòng dán nội dung bài dạy hoặc tải lên tệp tài liệu (PDF, ảnh trang sách, file văn bản) để AI tạo câu hỏi.',
      });
      return;
    }

    if (lessonText.length > MAX_TEXT_CHARS) {
      res.status(400).json({
        error: `Nội dung bài dạy quá dài (tối đa ${MAX_TEXT_CHARS.toLocaleString('vi-VN')} ký tự).`,
      });
      return;
    }

    const formatInstruction =
      questionFormat === 'multiple_choice'
        ? 'Tất cả câu hỏi đều là dạng trắc nghiệm 4 phương án A, B, C, D ("type": "multiple_choice").'
        : questionFormat === 'open'
          ? 'Tất cả câu hỏi đều là dạng tự luận / hỏi đáp ngắn trên lớp ("type": "open"), kèm đáp án gợi ý ngắn gọn dễ hiểu.'
          : 'Kết hợp hài hòa giữa câu trắc nghiệm 4 phương án ("type": "multiple_choice") và câu tự luận / hỏi đáp nhanh ("type": "open"), ưu tiên khoảng 65% trắc nghiệm và 35% tự luận.';

    const difficultyInstruction =
      difficulty === 'basic'
        ? 'Mức độ Cơ bản (nhận biết – thông hiểu nhẹ nhàng, dễ trả lời miệng ngay trên lớp).'
        : difficulty === 'advanced'
          ? 'Mức độ Vận dụng (kích thích tư duy, liên hệ thực tế, phân tích tình huống từ bài học).'
          : 'Mức độ Trung bình (cân bằng giữa nhận biết, thông hiểu và vận dụng nhẹ).';

    const promptText = [
      `Hãy tạo chính xác ${questionCount} câu hỏi ôn tập bằng tiếng Việt bám sát nội dung bài dạy được cung cấp.`,
      `Đối tượng học sinh: ${className}.`,
      subject ? `Môn học / Chủ đề gợi ý: ${subject}.` : '',
      requestedTitle ? `Tên bộ câu hỏi mong muốn: ${requestedTitle}.` : '',
      formatInstruction,
      difficultyInstruction,
      'Yêu cầu sư phạm:',
      '- Câu hỏi rõ ràng, ngắn gọn, tự nhiên, phù hợp để giáo viên chiếu trên bảng và hỏi trực tiếp học sinh trong trò chơi lớp học.',
      '- Với câu trắc nghiệm: luôn có đúng 4 phương án trong mảng "options" (không tự thêm tiền tố "A.", "B." vì giao diện đã hiển thị chữ cái), "correctOptionIndex" là số nguyên từ 0 đến 3, và "answerText" giải thích ngắn gọn 1 câu.',
      '- Với câu tự luận ("open"): mảng "options" để rỗng [] và cung cấp "answerText" là đáp án gợi ý súc tích cho giáo viên.',
      '- Đề xuất "title" (tên bộ câu hỏi ngắn gọn, có ý nghĩa) và "subject" (tên môn học) nếu giáo viên chưa chỉ định.',
      lessonText
        ? `\n--- NỘI DUNG BÀI DẠY ---\n${lessonText}\n--- HẾT NỘI DUNG ---`
        : `\nHãy đọc kỹ tài liệu đính kèm (${validatedFile?.fileName}) để trích xuất kiến thức trọng tâm và tạo bộ câu hỏi bám sát nội dung.`,
    ]
      .filter(Boolean)
      .join('\n');

    const parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [];

    if (validatedFile) {
      parts.push({
        inlineData: {
          mimeType: validatedFile.mimeType,
          data: validatedFile.base64,
        },
      });
    }
    parts.push({ text: promptText });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction:
            'Bạn là chuyên gia sư phạm Việt Nam, thiết kế câu hỏi tương tác hấp dẫn, chính xác kiến thức và phù hợp lứa tuổi cho học sinh Tiểu học và THCS. Chỉ trả về JSON hợp lệ theo đúng lược đồ.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Tên bộ câu hỏi ngắn gọn bằng tiếng Việt',
              },
              subject: {
                type: Type.STRING,
                description: 'Môn học của bộ câu hỏi',
              },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: '"multiple_choice" hoặc "open"',
                    },
                    prompt: {
                      type: Type.STRING,
                      description: 'Nội dung câu hỏi rõ ràng',
                    },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description:
                        '4 phương án trả lời nếu là multiple_choice, để [] nếu là open',
                    },
                    correctOptionIndex: {
                      type: Type.INTEGER,
                      description:
                        'Chỉ số đáp án đúng 0..3 nếu là multiple_choice',
                    },
                    answerText: {
                      type: Type.STRING,
                      description: 'Đáp án gợi ý hoặc giải thích ngắn gọn',
                    },
                  },
                  required: ['type', 'prompt'],
                },
              },
            },
            required: ['title', 'questions'],
          },
        },
      });

      const rawJson = (response.text ?? '').trim();
      if (!rawJson) {
        res.status(502).json({
          error: 'AI chưa trả về dữ liệu câu hỏi. Vui lòng thử lại.',
        });
        return;
      }

      const parsed = JSON.parse(rawJson) as GeneratedSetRaw;
      const rawQuestions = Array.isArray(parsed.questions)
        ? parsed.questions
        : [];

      const sanitizedQuestions = rawQuestions
        .map((q, idx) => {
          const prompt = typeof q.prompt === 'string' ? q.prompt.trim() : '';
          if (!prompt) return null;

          const normalizedType =
            q.type === 'multiple_choice' &&
            Array.isArray(q.options) &&
            q.options.filter((o) => typeof o === 'string' && o.trim()).length >= 2
              ? 'multiple_choice'
              : 'open';

          const answerText =
            typeof q.answerText === 'string' && q.answerText.trim()
              ? q.answerText.trim()
              : undefined;

          if (normalizedType === 'multiple_choice') {
            const cleanOpts = (q.options || [])
              .slice(0, 4)
              .map((opt, optIdx) => {
                const text = typeof opt === 'string' ? opt.trim() : '';
                const stripped = text.replace(/^[A-D]\s*[.):-]\s*/i, '').trim();
                return stripped || `Phương án ${String.fromCharCode(65 + optIdx)}`;
              });
            while (cleanOpts.length < 4) {
              cleanOpts.push(
                `Phương án ${String.fromCharCode(65 + cleanOpts.length)}`
              );
            }
            const rawIdx = Number(q.correctOptionIndex);
            const correctOptionIndex =
              Number.isInteger(rawIdx) && rawIdx >= 0 && rawIdx < 4 ? rawIdx : 0;

            return {
              id: `q_ai_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
              type: 'multiple_choice' as const,
              prompt,
              options: cleanOpts,
              correctOptionIndex,
              answerText,
            };
          }

          return {
            id: `q_ai_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'open' as const,
            prompt,
            answerText,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (sanitizedQuestions.length === 0) {
        res.status(502).json({
          error:
            'Không trích xuất được câu hỏi từ nội dung này. Giáo viên hãy thử cung cấp nội dung chi tiết hơn.',
        });
        return;
      }

      res.json({
        title:
          requestedTitle ||
          (typeof parsed.title === 'string' && parsed.title.trim()) ||
          `Bộ câu hỏi ${className}`,
        subject:
          subject ||
          (typeof parsed.subject === 'string' && parsed.subject.trim()) ||
          undefined,
        questions: sanitizedQuestions,
      });
    } catch (err: unknown) {
      const errObj = err as { status?: number; message?: string };
      const status = errObj?.status;
      const msg = typeof errObj?.message === 'string' ? errObj.message : '';

      if (status === 403 || status === 400 || /API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)) {
        res.status(502).json({
          error:
            'Khóa API Gemini không hợp lệ hoặc chưa đủ quyền. Vui lòng kiểm tra lại trong Settings > Secrets.',
        });
        return;
      }
      if (status === 429 || /RESOURCE_EXHAUSTED/i.test(msg)) {
        res.status(429).json({
          error:
            'Hệ thống AI đang quá tải hoặc hết hạn mức tạm thời. Vui lòng thử lại sau ít phút.',
        });
        return;
      }

      console.error('Error generating questions via Gemini:', err);
      res.status(500).json({
        error: 'Có lỗi khi AI tạo bộ câu hỏi. Vui lòng thử lại.',
      });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
