from __future__ import annotations

import re
from backend.app.coach import _citations, _excerpts, _parse_model_json, complete
from backend.app.config import DISCLAIMER_TEXT
from backend.app.models import (
    PersonaProfile,
    SimulationChatRequest,
    SimulationChatResponse,
    SimulationCoachFeedback,
)
from backend.app.rag.retrieve import retrieve

DEFAULT_PERSONAS: list[PersonaProfile] = [
    PersonaProfile(
        id="linh-introvert",
        name="Linh",
        avatar="🌸",
        tagline="Hướng nội, gu thẩm mỹ & thích đọc sách",
        age=23,
        archetype="introvert",
        vibe_description=(
            "Làm việc ngành sáng tạo nội dung. Thích cà phê một mình, đọc sách, nghe podcast indie. "
            "Dễ ngột ngạt nếu bị hỏi dồn dập, hỏi cung hoặc bắt chuyện sáo rỗng. "
            "Thích ai để ý chi tiết nhỏ và trò chuyện chân thành, chậm rãi, có gu riêng."
        ),
        messaging_style="Trả lời từ tốn, dùng từ ngữ tinh tế, câu từ sâu sắc, ít dùng teencode.",
        sample_opener_hint="Hỏi về một cuốn sách, một bài hát hay hoặc góc quán cà phê yên tĩnh.",
    ),
    PersonaProfile(
        id="huy-energetic",
        name="Huy",
        avatar="⚡",
        tagline="Năng động, thể thao & vui tính",
        age=26,
        archetype="energetic",
        vibe_description=(
            "Lập trình viên, mê chạy bộ marathon và du lịch khám phá. "
            "Thích người nói chuyện vui tính, tự nhiên, phóng khoáng, thích trêu đùa. "
            "Hay rep nhanh khi rảnh rỗi nhưng tập trung cao độ trong giờ làm việc."
        ),
        messaging_style="Hài hước, dùng nhiều emoji, ngắn gọn, thẳng thắn, phóng khoáng.",
        sample_opener_hint="Bắt chuyện về thể thao, chạy bộ, quán ăn ngon hoặc hỏi sở thích xả stress cuối tuần.",
    ),
    PersonaProfile(
        id="mai-cautious",
        name="Mai",
        avatar="🛡️",
        tagline="Thận trọng, tinh tế & giữ ranh giới",
        age=25,
        archetype="cautious",
        vibe_description=(
            "Từng trải qua mối quan hệ không vui nên khá thận trọng khi tìm hiểu người mới. "
            "Dị ứng với kiểu hỏi dồn dập điều tra lý lịch hoặc rủ đi chơi quá vội vã. "
            "Đánh giá cao sự lịch thiệp, tôn trọng ranh giới và chia sẻ chân thành, cân bằng."
        ),
        messaging_style="Nhã nhặn nhưng giữ khoảng cách, trả lời chừng mực, chỉ cởi mở khi cảm thấy an toàn và hợp vibe.",
        sample_opener_hint="Bắt chuyện bằng một câu chuyện vui nhẹ nhàng thường ngày hoặc góc nhìn thú vị về cuộc sống.",
    ),
]


def get_default_personas() -> list[PersonaProfile]:
    return DEFAULT_PERSONAS


SIMULATION_SYSTEM_PROMPT = """Bạn là trợ lý mô phỏng hội thoại tán tỉnh, hẹn hò thực tế hai vai trò (Dual-Role Flirting & Dating Simulator):

BỐI CẢNH:
- Đây là cuộc trò chuyện nhắn tin tán tỉnh, tìm hiểu nhau giữa hai người (có thể nhắn qua Messenger, Instagram, Zalo, quen nhau ngoài đời, bạn bè giới thiệu hoặc hẹn hò thường ngày — KHÔNG gò bó là chỉ vừa match trên app hẹn hò).
- Cuộc trò chuyện cần mang đúng chất nhắn tin tán tỉnh đời thường của người Việt: tự nhiên, duyên dáng, gần gũi, có cảm xúc, có trêu đùa, có thăm dò cảm xúc lẫn nhau.

VAI TRÒ 1: NHẬP VAI ĐỐI TƯỢNG ĐANG TRÒ CHUYỆN / TÁN TỈNH (TARGET PERSONA):
- Nhập vai 100% vào nhân vật được cung cấp (tên, tính cách, vibe, phong cách nhắn tin).
- Nói chuyện CỰC KỲ ĐỜI THƯỜNG, tự nhiên như giới trẻ Việt Nam đang nhắn tin tán tỉnh, tìm hiểu nhau:
  + Dùng cách xưng hô phù hợp, tự nhiên (mình - bạn, tớ - cậu, anh - em tùy ngữ cảnh và cách đối phương xưng hô).
  + Thể hiện cảm xúc chân thực: Nếu câu chuyện vui, thú vị ➜ hào hứng, trêu lại hoặc kể thêm chuyện của mình.
  + Nếu đối phương thả thính khéo ➜ ngượng ngùng, tung hứng hoặc đùa lại một cách duyên dáng.
  + Nếu đối phương tỏ tình quá sớm, đốt cháy giai đoạn (ví dụ: "làm người yêu mình nhé", "yêu anh không"): phản ứng bất ngờ, bật cười, trêu đùa hoặc từ chối khéo (ví dụ: "Ủa đang nói chuyện vui tự nhiên chốt hạ làm người yêu nhanh thế haha, phải tìm hiểu xem hợp nhau không đã chứ!"). TUYỆT ĐỐI không đồng ý làm người yêu ngay khi mới nói vài câu!
  + Nếu đối phương nói chuyện nhạt nhẽo, hỏi cung điều tra (hỏi dồn dập ở đâu, làm gì, lương bao nhiêu): trả lời ngắn gọn, hạ nhiệt nhịp độ.
- TUYỆT ĐỐI KHÔNG lặp lại bất kỳ câu mô tả hay placeholder hướng dẫn nào. Hãy tự viết lời đối đáp của nhân vật.

VAI TRÒ 2: DATING COACH (CHUYÊN GIA TƯ VẤN NGHỆ THUẬT NHẮN TIN TÁN TỈNH):
- Phân tích khách quan tin nhắn người dùng vừa gửi trong bối cảnh nhắn tin tán tỉnh, làm quen:
  + tone_evaluation: Đánh giá cảm xúc, mức độ duyên dáng, độ tự nhiên (có bị cứng nhắc, hỏi cung, vồ vập, hay khéo léo, cuốn hút).
  + vibe_score: "positive" (duyên dáng, cuốn hút, kết nối tốt) | "neutral" (bình thường, hơi an toàn/nhạt) | "warning" (vồ vập, gượng gạo, hỏi cung, đốt cháy giai đoạn).
  + advice: 1-2 câu lời khuyên cụ thể giúp đẩy nhịp độ, tạo điểm nhấn hoặc gợi mở đề tài để đối phương hào hứng nhắn tiếp.
  + suggested_replies: 2 câu gợi ý nhắn tin tiếp theo vừa tự nhiên, vừa có duyên, đúng chất tán tỉnh đời thường (không máy móc).

Định dạng trả về BẮT BUỘC là JSON duy nhất:
{
  "target_reply": "Lời đáp thực tế bằng tiếng Việt của nhân vật",
  "coach_feedback": {
    "tone_evaluation": "Đánh giá chi tiết về tin nhắn bạn vừa gửi",
    "vibe_score": "positive" | "neutral" | "warning",
    "advice": "Lời khuyên nên xử lý thế nào tiếp theo",
    "suggested_replies": [
      "Câu gợi ý 1",
      "Câu gợi ý 2"
    ]
  }
}
"""


def _is_placeholder_reply(text: str) -> bool:
    low = text.lower()
    return (
        "nhập vai 100%" in low
        or "tin nhắn trả lời từ phía đối tượng" in low
        or "1-2 câu nhận xét" in low
        or "câu gợi ý 1" in low
    )


def _generate_fallback_for_user_msg(user_msg: str, persona: PersonaProfile) -> SimulationChatResponse:
    low = user_msg.lower()
    # If user asks to be girlfriend/boyfriend prematurely
    if any(k in low for k in ["làm người yêu", "yêu mình", "yêu anh", "yêu em", "yêu nhau", "cưới"]):
        target = (
            f"Ơ kìa {persona.name} hơi bất ngờ đó nha! 😅 Đang nói chuyện vui tự nhiên "
            f"đòi làm người yêu nhanh thế haha? Tụi mình phải trò chuyện tìm hiểu xem có hợp vibe nhau trước đã chứ!"
        )
        feedback = SimulationCoachFeedback(
            tone_evaluation="Bạn đang đi quá nhanh và đốt cháy giai đoạn. Khi nhắn tin tán tỉnh mà vội vàng đề nghị yêu đương sẽ tạo cảm giác vội vã, thiếu tự nhiên và khiến đối phương phòng thủ.",
            vibe_score="warning",
            advice="Hãy hạ nhiệt ngay bằng một câu đùa nhẹ nhàng để không khí tự nhiên trở lại, sau đó kéo về câu chuyện thường ngày.",
            suggested_replies=[
                "Haha tớ trêu xem phản ứng của cậu thế nào thôi! Chứ tớ cũng thích tìm hiểu từ từ mà.",
                "Công nhận tớ hơi vội thật 😅 Thôi cho tớ rút lại nhé, bắt đầu lại bằng chuyện hôm nay của cậu thế nào nha?",
            ],
        )
    else:
        target = f"Nghe thú vị ghê! Cậu kể thêm cho {persona.name} nghe với nào? 😊"
        feedback = SimulationCoachFeedback(
            tone_evaluation="Tin nhắn tự nhiên, cởi mở, tạo cảm giác thoải mái và dễ gần khi trò chuyện tán tỉnh.",
            vibe_score="positive",
            advice="Hãy tiếp tục duy trì nhịp trò chuyện hai chiều, vừa chia sẻ góc nhìn của mình vừa gợi mở để đối phương kể chuyện.",
            suggested_replies=[
                f"Thế dạo này {persona.name} có đang mê bộ phim hay bài hát nào không?",
                "Hôm nay của cậu thế nào, có gì vui không kể tớ nghe với?",
            ],
        )
    return SimulationChatResponse(target_reply=target, coach_feedback=feedback, citations=[])


def simulate_chat(request: SimulationChatRequest) -> SimulationChatResponse:
    persona = request.persona
    user_latest_msg = ""
    for msg in reversed(request.messages):
        if msg.role == "user":
            user_latest_msg = msg.content
            break

    # RAG: Retrieve knowledge about conversation rhythm & openers
    query = f"nhịp điệu hội thoại nhắn tin hẹn hò {user_latest_msg}"
    hits = retrieve(query, top_k=3)
    excerpts_text = _excerpts(hits) if hits else ""

    # Format dialogue history
    history_lines = []
    for msg in request.messages[-8:]:
        sender = "Bạn" if msg.role == "user" else persona.name
        history_lines.append(f"{sender}: {msg.content}")
    dialogue_history = "\n".join(history_lines)

    user_prompt = f"""=== NHÂN VẬT BẠN ĐANG NHẬP VAI ===
- Tên: {persona.name}, {persona.age} tuổi
- Tính cách: {persona.vibe_description}
- Cách nhắn tin: {persona.messaging_style}

=== TRI THỨC HUẤN LUYỆN TỪ KNOWLEDGE BASE ===
{excerpts_text or "(Nhịp độ cân bằng, tôn trọng ranh giới, không vồ vập, đặt câu hỏi mở)"}

=== ĐOẠN CHAT THỰC TẾ ĐANG DIỄN RA ===
{dialogue_history}

Hãy đọc kỹ tin nhắn cuối cùng của Bạn ("{user_latest_msg}") và thực hiện:
1. Trong "target_reply": Bạn hóa thân thành {persona.name} để trả lời thật tự nhiên, chân thật (CÓ CẢM XÚC, dùng từ ngữ giới trẻ, không văn mẫu).
2. Trong "coach_feedback": Đánh giá độ tinh tế của Bạn và hướng dẫn cách tiếp tục.

Trả về duy nhất định dạng JSON."""

    try:
        raw_response = complete(
            user_prompt,
            system_prompt=SIMULATION_SYSTEM_PROMPT,
            temperature=0.7,
        )
        parsed = _parse_model_json(raw_response)
    except Exception:
        return _generate_fallback_for_user_msg(user_latest_msg, persona)

    target_reply = str(parsed.get("target_reply") or "").strip()
    feedback_raw = parsed.get("coach_feedback")

    # If the LLM echoed template placeholders, replace with intelligent fallback
    if not target_reply or _is_placeholder_reply(target_reply):
        return _generate_fallback_for_user_msg(user_latest_msg, persona)

    if not isinstance(feedback_raw, dict):
        feedback_raw = {}

    tone_eval = str(feedback_raw.get("tone_evaluation") or "").strip()
    if not tone_eval or _is_placeholder_reply(tone_eval):
        tone_eval = "Tin nhắn của bạn thể hiện sự tương tác trực tiếp với đối phương."

    vibe_score = feedback_raw.get("vibe_score")
    if vibe_score not in {"positive", "neutral", "warning"}:
        vibe_score = "neutral"

    advice = str(feedback_raw.get("advice") or "").strip()
    if not advice or _is_placeholder_reply(advice):
        advice = "Hãy tiếp tục giữ nhịp trò chuyện cởi mở và chú ý phản ứng của đối phương."

    suggested = feedback_raw.get("suggested_replies")
    suggested_list = [str(s).strip() for s in suggested if str(s).strip() and not _is_placeholder_reply(str(s))] if isinstance(suggested, list) else []
    if not suggested_list:
        suggested_list = [
            f"Thế còn {persona.name} thì sao, thường thích làm gì vào những ngày rảnh rỗi?",
            f"Nghe thú vị thật đấy, {persona.name} kể thêm chút được không?",
        ]

    coach_feedback = SimulationCoachFeedback(
        tone_evaluation=tone_eval,
        vibe_score=vibe_score,
        advice=advice,
        suggested_replies=suggested_list[:3],
    )

    citations = _citations(hits) if hits else []

    return SimulationChatResponse(
        target_reply=target_reply,
        coach_feedback=coach_feedback,
        citations=citations,
    )
