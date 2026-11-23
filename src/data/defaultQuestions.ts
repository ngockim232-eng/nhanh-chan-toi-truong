import { QuestionSet } from '../types/game';

export const DEFAULT_QUESTION_SETS: QuestionSet[] = [
  {
    id: 'qs-kien-thuc-chung',
    title: 'Kiến thức chung & Tự nhiên Xã hội',
    subject: 'Tổng hợp',
    questions: [
      {
        id: 'q_kc_1',
        type: 'multiple_choice',
        prompt: 'Anh hùng trẻ tuổi Lý Tự Trọng nổi tiếng với câu nói bất hủ nào?',
        options: [
          'Con đường của thanh niên chỉ là con đường cách mạng, không thể có con đường nào khác',
          'Không có gì quý hơn độc lập, tự do',
          'Học, học nữa, học mãi',
          'Vì lợi ích mười năm trồng cây, vì lợi ích trăm năm trồng người',
        ],
        correctOptionIndex: 0,
        answerText:
          'Câu nói nổi tiếng của anh hùng Lý Tự Trọng trước tòa án thực dân năm 1931.',
      },
      {
        id: 'q_kc_2',
        type: 'multiple_choice',
        prompt: 'Hành tinh nào trong Hệ Mặt Trời được mệnh danh là "Hành tinh Đỏ"?',
        options: ['Sao Kim', 'Sao Hỏa', 'Sao Mộc', 'Sao Thủy'],
        correctOptionIndex: 1,
        answerText: 'Sao Hỏa có bề mặt chứa nhiều oxit sắt tạo nên màu đỏ cam đặc trưng.',
      },
      {
        id: 'q_kc_3',
        type: 'multiple_choice',
        prompt: 'Quá trình cây xanh sử dụng ánh sáng mặt trời để tạo ra chất hữu cơ và khí oxy gọi là gì?',
        options: ['Hô hấp', 'Thoát hơi nước', 'Quang hợp', 'Thẩm thấu'],
        correctOptionIndex: 2,
        answerText: 'Quang hợp diễn ra chủ yếu ở lục lạp trong tế bào lá cây.',
      },
      {
        id: 'q_kc_4',
        type: 'multiple_choice',
        prompt: 'Đỉnh núi cao nhất Việt Nam nằm trên dãy Hoàng Liên Sơn là đỉnh nào?',
        options: ['Bà Đen', 'Langbiang', 'Ngọc Linh', 'Fansipan'],
        correctOptionIndex: 3,
        answerText: 'Đỉnh Fansipan cao 3.143m, được mệnh danh là Nóc nhà Đông Dương.',
      },
      {
        id: 'q_kc_5',
        type: 'open',
        prompt: 'Em hãy nêu 3 việc làm thiết thực để giữ gìn trường lớp luôn xanh – sạch – đẹp!',
        answerText:
          'Bỏ rác đúng nơi quy định, chăm sóc cây xanh, giữ gìn bàn ghế và không vẽ bậy lên tường.',
      },
    ],
  },
  {
    id: 'qs-toan-vui',
    title: 'Toán học tư duy nhanh',
    subject: 'Toán học',
    questions: [
      {
        id: 'q_toan_1',
        type: 'multiple_choice',
        prompt: 'Tổng số đo ba góc trong một tam giác bất kỳ bằng bao nhiêu độ?',
        options: ['90°', '180°', '270°', '360°'],
        correctOptionIndex: 1,
        answerText: 'Theo định lý tổng ba góc của tam giác, tổng luôn bằng 180°.',
      },
      {
        id: 'q_toan_2',
        type: 'multiple_choice',
        prompt: 'Giá trị của biểu thức 15 × 4 + 20 : 5 bằng bao nhiêu?',
        options: ['16', '64', '80', '60'],
        correctOptionIndex: 1,
        answerText: 'Thực hiện nhân chia trước, cộng trừ sau: 60 + 4 = 64.',
      },
      {
        id: 'q_toan_3',
        type: 'multiple_choice',
        prompt: 'Số nào sau đây là số nguyên tố?',
        options: ['21', '27', '29', '33'],
        correctOptionIndex: 2,
        answerText: '29 chỉ chia hết cho 1 và chính nó.',
      },
      {
        id: 'q_toan_4',
        type: 'open',
        prompt: 'Một hình chữ nhật có chiều dài 12 cm và chiều rộng 7 cm. Tính chu vi và diện tích của hình chữ nhật đó.',
        answerText: 'Chu vi = (12 + 7) × 2 = 38 cm; Diện tích = 12 × 7 = 84 cm².',
      },
    ],
  },
  {
    id: 'qs-tieng-viet',
    title: 'Tiếng Việt & Văn học',
    subject: 'Ngữ văn',
    questions: [
      {
        id: 'q_tv_1',
        type: 'multiple_choice',
        prompt: 'Điền từ còn thiếu vào câu tục ngữ: "Đi một ngày đàng, học một sàng ..."',
        options: ['hay', 'khôn', 'vui', 'giỏi'],
        correctOptionIndex: 1,
        answerText: '"Đi một ngày đàng, học một sàng khôn" — khuyên ta nên đi nhiều, học hỏi nhiều điều mới.',
      },
      {
        id: 'q_tv_2',
        type: 'multiple_choice',
        prompt: 'Biện pháp tu từ nào được sử dụng trong câu "Mặt trời xuống biển như hòn lửa"?',
        options: ['Nhân hóa', 'So sánh', 'Điệp ngữ', 'Nói quá'],
        correctOptionIndex: 1,
        answerText: 'So sánh "Mặt trời" với "hòn lửa" qua từ so sánh "như".',
      },
      {
        id: 'q_tv_3',
        type: 'open',
        prompt: 'Em hãy đặt một câu có sử dụng biện pháp nhân hóa để miêu tả quang cảnh buổi sáng đến trường.',
        answerText:
          'Ví dụ: "Những hàng cây phượng vĩ vẫy tay chào đón chúng em vui bước tới trường."',
      },
      {
        id: 'q_tv_4',
        type: 'open',
        prompt: 'Tìm 3 từ đồng nghĩa với từ "chăm chỉ" và đặt một câu với một trong các từ vừa tìm được.',
        answerText: 'Các từ đồng nghĩa: siêng năng, cần cù, chuyên cần, chịu khó.',
      },
    ],
  },
];
