import { CHIBI_CATALOG, getChibiSpec } from './chibiCatalog';
import { ClassRoom, Gender, StudentProfile } from '../types/game';

export const DEFAULT_SCHOOL_NAME =
  'TRƯỜNG PTDTBT TIỂU HỌC VÀ TRUNG HỌC CƠ SỞ LÝ TỰ TRỌNG';

const GIRL_NAME_HINTS = [
  'anh', 'linh', 'nhi', 'ngọc', 'vy', 'hà', 'trang', 'thảo', 'mai', 'lan',
  'hương', 'quỳnh', 'trâm', 'chi', 'my', 'nhung', 'yến', 'phương', 'ngân',
  'hân', 'tâm', 'thư', 'uyên', 'diễm', 'hiền', 'hoa', 'bích', 'trúc', 'châu',
  'na', 'bông', 'nga', 'hồng', 'oanh', 'ly', 'như', 'vân', 'huyền', 'diệp',
  'nhàn', 'dung', 'loan', 'thu', 'tuyết', 'khuê', 'mi', 'xinh', 'sương', 'mơ',
];

const BOY_NAME_HINTS = [
  'minh', 'huy', 'khánh', 'nam', 'đức', 'phúc', 'long', 'bảo', 'khang',
  'dũng', 'tuấn', 'hùng', 'quân', 'sơn', 'tùng', 'phong', 'hải', 'đạt',
  'trung', 'thành', 'kiên', 'khoa', 'hoàng', 'vinh', 'hiếu', 'phát', 'an',
  'tài', 'nhật', 'thịnh', 'trí', 'quốc', 'lâm', 'cường', 'khôi', 'tiến',
  'mạnh', 'thắng', 'hào', 'bình', 'kiệt', 'nghĩa', 'trường', 'toàn', 'tấn',
  'phú', 'đô', 'gấu', 'sóc', 'sáng', 'khải',
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function guessGenderFromName(name: string, index = 0): Gender {
  const lower = name.trim().toLowerCase();
  const words = lower.split(/\s+/);
  const lastWord = words[words.length - 1] || lower;

  if (GIRL_NAME_HINTS.some((hint) => lower.endsWith(hint) || lastWord === hint)) {
    return 'girl';
  }
  if (BOY_NAME_HINTS.some((hint) => lower.endsWith(hint) || lastWord === hint)) {
    return 'boy';
  }
  return index % 2 === 0 ? 'boy' : 'girl';
}

export function createStudentProfile(
  name: string,
  index: number,
  explicitGender?: Gender,
  explicitVariant?: number
): StudentProfile {
  const cleanName = name.trim();
  const h = hashString(cleanName + '_' + index);
  const gender =
    explicitVariant !== undefined
      ? CHIBI_CATALOG[explicitVariant]?.gender ?? explicitGender ?? guessGenderFromName(cleanName, index)
      : explicitGender ?? guessGenderFromName(cleanName, index);

  // Assign distinct Chibi variant from 0..9 (boys) or 10..19 (girls)
  const variant =
    explicitVariant !== undefined
      ? explicitVariant
      : gender === 'boy'
        ? index % 10
        : 10 + (index % 10);

  const spec = getChibiSpec(variant, gender);

  return {
    id: `stu_${index}_${h}`,
    name: cleanName,
    gender,
    chibiVariant: spec.id,
    hairDesign: spec.hairDesign,
    backpackStyle: spec.backpackStyle,
    glassesStyle: spec.glassesStyle,
    hairStyle: spec.id % 4,
    hairColor: spec.hairColor,
    backpackColor: spec.backpackColor,
    shoeColor: spec.shoeColor,
    hasGlasses: spec.glassesStyle !== 'none',
    ribbonColor: spec.accentColor,
  };
}

/**
 * Assigns distinct Chibi variants cleanly across a list of names so
 * up to 10 boys and 10 girls (all 20 Chibis) look completely unique!
 */
export function buildClassStudents(names: string[], classPrefix: string): StudentProfile[] {
  let boyCounter = 0;
  let girlCounter = 0;

  return names.map((rawName, idx) => {
    const cleanName = rawName.trim();
    const gender = guessGenderFromName(cleanName, idx);
    const variant =
      gender === 'boy'
        ? boyCounter++ % 10
        : 10 + (girlCounter++ % 10);
    const profile = createStudentProfile(cleanName, idx, gender, variant);
    return {
      ...profile,
      id: `${classPrefix}_${idx}_${hashString(cleanName)}`,
    };
  });
}

export const DEFAULT_CLASSROOMS: ClassRoom[] = [
  {
    id: 'lop-1a',
    name: 'Lớp 1A',
    students: buildClassStudents(
      [
        'Minh Khang', 'Gia Hân', 'Bảo Nam', 'Tuệ Nhi', 'Đức Phúc',
        'Khánh Linh', 'Gia Huy', 'Thảo Vy', 'Hoàng Long', 'Ngọc Trâm',
        'Quốc Bảo', 'Phương Anh', 'Anh Quân', 'Bảo Ngọc', 'Đăng Khoa',
        'Hà My', 'Nhật Minh', 'Mai Chi', 'Thành Đạt', 'Kim Ngân',
      ],
      '1a'
    ),
  },
  {
    id: 'lop-2a',
    name: 'Lớp 2A',
    students: buildClassStudents(
      [
        'Tuấn Kiệt', 'Minh Thư', 'Hữu Phát', 'Hải Yến', 'Trung Kiên',
        'Quỳnh Như', 'Văn Hùng', 'Thanh Trúc', 'Gia Bảo', 'Ngọc Hân',
        'Đức Anh', 'Thùy Linh', 'Hoàng Nam', 'Bảo Châu', 'Quốc Huy',
        'Diệu Hương', 'Tiến Đạt', 'Tuyết Nhi', 'Xuân Trường', 'Khánh Vân',
      ],
      '2a'
    ),
  },
  {
    id: 'lop-3a',
    name: 'Lớp 3A',
    students: buildClassStudents(
      [
        'Ngọc Sơn', 'Lan Anh', 'Mạnh Dũng', 'Thu Hà', 'Minh Trí',
        'Hồng Nhung', 'Quang Hải', 'Bích Ngọc', 'Việt Hoàng', 'Ngọc Mai',
        'Đình Phong', 'Thảo Nguyên', 'Tấn Phát', 'Phương Thảo', 'Gia Khánh',
        'Bảo Trâm', 'Khắc Hiếu', 'Mỹ Duyên', 'Đức Thắng', 'Thanh Nga',
      ],
      '3a'
    ),
  },
  {
    id: 'lop-4a',
    name: 'Lớp 4A',
    students: buildClassStudents(
      [
        'Hoàng Phúc', 'Gia Linh', 'Bảo Long', 'Ngọc Diệp', 'Minh Quân',
        'Thùy Dương', 'Quốc Thịnh', 'Ánh Tuyết', 'Đức Kiên', 'Hà Phương',
        'Tuấn Anh', 'Bảo Vy', 'Nhật Hào', 'Khánh Chi', 'Thanh Bình',
        'Minh Châu', 'Văn Tài', 'Hương Giang', 'Hữu Nghĩa', 'Thu Hiền',
      ],
      '4a'
    ),
  },
  {
    id: 'lop-5a',
    name: 'Lớp 5A',
    students: buildClassStudents(
      [
        'Anh Khoa', 'Phương Linh', 'Gia Hưng', 'Ngọc Ánh', 'Hoàng Khải',
        'Thảo My', 'Đức Mạnh', 'Quỳnh Anh', 'Minh Hải', 'Bảo Uyên',
        'Quốc Toàn', 'Thanh Mai', 'Tiến Dũng', 'Hải Yến', 'Ngọc Minh',
        'Kim Oanh', 'Văn Sơn', 'Hồng Hạnh', 'Khánh Duy', 'Minh Nguyệt',
      ],
      '5a'
    ),
  },
  {
    id: 'lop-6a',
    name: 'Lớp 6A',
    students: buildClassStudents(
      [
        'Nguyễn Minh Khôi', 'Trần Ngọc Lan', 'Lê Quốc Đạt', 'Phạm Thu Trang',
        'Hoàng Gia Bảo', 'Vũ Khánh Huyền', 'Đặng Tuấn Vũ', 'Bùi Phương Nhi',
        'Ngô Đức Thịnh', 'Đỗ Hải Anh', 'Lý Quang Vinh', 'Dương Thảo Ly',
        'Trịnh Văn Cường', 'Phan Bảo Hân', 'Tạ Minh Đức', 'Mai Ngọc Bích',
        'Chu Hoàng Nam', 'Võ Quỳnh Trâm', 'Lương Tiến Phát', 'Hồ Thanh Tâm',
      ],
      '6a'
    ),
  },
  {
    id: 'lop-7a',
    name: 'Lớp 7A',
    students: buildClassStudents(
      [
        'Trần Anh Dũng', 'Nguyễn Hải Yến', 'Phạm Gia Huy', 'Lê Minh Thư',
        'Vũ Quốc Khánh', 'Hoàng Ngọc Châu', 'Bùi Đức Anh', 'Đỗ Thảo Nguyên',
        'Đặng Nhật Minh', 'Ngô Thanh Trúc', 'Lý Thành Long', 'Phan Kim Ngân',
        'Dương Văn Hùng', 'Trịnh Phương Anh', 'Mai Quang Hải', 'Tạ Bảo Ngọc',
        'Võ Minh Quân', 'Chu Quỳnh Như', 'Hồ Trung Kiên', 'Lương Mai Chi',
      ],
      '7a'
    ),
  },
  {
    id: 'lop-8a',
    name: 'Lớp 8A',
    students: buildClassStudents(
      [
        'Lê Hoàng Phong', 'Nguyễn Khánh Linh', 'Trần Đức Phúc', 'Phạm Bảo Trâm',
        'Hoàng Tuấn Kiệt', 'Vũ Thu Hiền', 'Đỗ Quốc Bảo', 'Bùi Ngọc Diệp',
        'Ngô Mạnh Hùng', 'Đặng Hà My', 'Phan Tiến Đạt', 'Lý Hồng Nhung',
        'Trịnh Gia Khánh', 'Dương Thảo Vy', 'Tạ Văn Thắng', 'Mai Bích Ngọc',
        'Hồ Minh Trí', 'Võ Tuyết Nhi', 'Chu Hữu Phát', 'Lương Ánh Dương',
      ],
      '8a'
    ),
  },
  {
    id: 'lop-9a',
    name: 'Lớp 9A',
    students: buildClassStudents(
      [
        'Phạm Minh Đức', 'Trần Phương Thảo', 'Nguyễn Quốc Huy', 'Lê Ngọc Trâm',
        'Vũ Hoàng Long', 'Hoàng Thùy Linh', 'Đặng Xuân Trường', 'Bùi Minh Châu',
        'Ngô Tuấn Anh', 'Đỗ Gia Hân', 'Lý Bảo Nam', 'Phan Hương Giang',
        'Dương Đăng Khoa', 'Trịnh Quỳnh Anh', 'Mai Thành Đạt', 'Tạ Kim Oanh',
        'Võ Văn Tài', 'Chu Thanh Mai', 'Hồ Khắc Hiếu', 'Lương Ngọc Ánh',
      ],
      '9a'
    ),
  },
];

export const DEFAULT_STUDENTS: StudentProfile[] = DEFAULT_CLASSROOMS[0].students;

export const STROLL_CHAT_LINES = [
  'Chào buổi sáng!',
  'Hôm nay trời đẹp quá!',
  'Đợi mình với nào!',
  'Cậu thuộc bài cũ chưa?',
  'Sắp tới Trường Lý Tự Trọng rồi!',
  'Đi từ từ thôi bạn ơi!',
  'Hoa hai bên đường đẹp quá!',
  'Sáng nay mát trời ghê!',
  'Hôm nay mong cô gọi trả bài!',
];

export const PANIC_SHOUT_LINES = [
  'Á á á! Chó tới rồi!',
  'Chạy mau lên các bạn ơi!',
  'Cứu mình với!',
  'Nhanh kẻo bị gọi trả bài!',
  'Dép ơi ở lại nhé!',
  'Chạy nhanh kẻo bị ngoạm!',
  'Đừng đuổi theo tớ mà!',
  'Cổng trường ơi đợi tớ!',
];

export const SAFE_CHEER_LINES = [
  'Thoát rồi!',
  'Hú hồn luôn!',
  'An toàn rồi nè!',
  'Nhanh như chớp!',
  'Vào trường rồi!',
];

export const CAUGHT_COMIC_QUOTES = [
  'Ôi không! Chạy chậm quá nên được mời trả lời câu hỏi rồi!',
  'Chú chó tinh nghịch đã giữ bạn lại để trả lời câu hỏi giúp cô/thầy nhé!',
  'Rơi mất chiếc dép rồi, đành đứng lên trả lời thật xuất sắc thôi!',
  'Chạy chưa kịp vào cổng Trường Lý Tự Trọng — tự tin trả lời nhé!',
  'Chú chó thích cặp sách của bạn quá nên chọn bạn trả lời câu hỏi đấy!',
  'Lần sau nhớ chạy nhanh hơn, còn bây giờ mời bạn trả lời câu hỏi nha!',
];

export const DOG_BARK_LINES = [
  'GÂU GÂU!',
  'GÂU! CHỌN BẠN NÀY NÈ!',
  'GÂU GÂU GÂU!',
  'ĐỨNG LẠI TRẢ LỜI NÀO!',
];
