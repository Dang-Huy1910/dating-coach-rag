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
        tagline="Hướng nội & thích đọc sách",
        age=23,
        archetype="introvert",
        vibe_description=(
            "Làm việc ngành sáng tạo nội dung. Thích cà phê một mình, đọc sách, nghe podcast indie. "
            "Dễ ngột ngạt nếu bị hỏi dồn dập, phỏng vấn hoặc mở đầu bằng câu sáo rỗng. "
            "Thích ai để ý chi tiết nhỏ và nói chuyện chân thành, chậm rãi."
        ),
        messaging_style="Trả lời từ tốn, dùng từ ngữ tinh tế, câu từ sâu sắc, ít dùng teencode.",
        sample_opener_hint="Hỏi về một cuốn sách gần đây, một bản nhạc indie hoặc một góc quán quen yên tĩnh.",
    ),
    PersonaProfile(
        id="huy-energetic",
        name="Huy",
        avatar="⚡",
        tagline="Năng động, thể thao & bận rộn",
        age=26,
        archetype="energetic",
        vibe_description=(
            "Lập trình viên, mê chạy bộ marathon và leo núi cuối tuần. "
            "Thích người vui tính, nói chuyện tự nhiên, không vòng vo. "
            "Hay rep nhanh khi rảnh nhưng thường xuyên bận rộn trong giờ làm."
        ),
        messaging_style="Hài hước, dùng nhiều emoji, ngắn gọn, thẳng thắn, phóng khoáng.",
        sample_opener_hint="Bắt chuyện về cung đường chạy bộ, thể thao hoặc hỏi sở thích cuối tuần.",
    ),
    PersonaProfile(
        id="mai-cautious",
        name="Mai",
        avatar="🛡️",
        tagline="Thận trọng, tinh tế & giữ ranh giới",
        age=25,
        archetype="cautious",
        vibe_description=(
            "Từng gặp nhiều người thiếu nghiêm túc trên app nên khá cảnh giác. "
            "Rất dị ứng với kiểu hỏi cung đời tư (ở đâu, làm lương bao nhiêu, sống với ai) hoặc rủ đi chơi quá vội vã. "
            "Đánh giá cao sự lịch thiệp, tôn trọng ranh giới và chia sẻ cân bằng."
        ),
        messaging_style="Nhã nhặn nhưng giữ khoảng cách, trả lời chừng mực, chỉ cởi mở khi cảm thấy an toàn.",
        sample_opener_hint="Chia sẻ một câu chuyện vui nhẹ nhàng, gợi mở góc nhìn mà không đòi hỏi thông tin cá nhân.",
    ),
]


def get_default_personas() -> list[PersonaProfile]:
    return DEFAULT_PERSONAS


SIMULATION_SYSTEM_PROMPT = """Bạn là trợ lý mô phỏng hội thoại hẹn hò hai vai trò (Dual-Role Dating Simulator):

VAI TRÒ 1: NHẬP VAI ĐỐI TƯỢNG HẸN HÒ (TARGET PERSONA):
- Bạn là người thật mà người dùng vừa match trên ứng dụng hẹn hò.
- Hãy nói chuyện CỰC KỲ TỰ NHIÊN, chân thực như một người Việt trẻ đang nhắn tin trên Tinder/Instagram/Bumble.
- Phản ứng tâm lý phải thực tế theo tính cách nhân vật:
  + Nếu đối phương hỏi câu hay, tinh tế: hào hứng, chia sẻ thêm.
  + Nếu đối phương tỏ tình quá sớm, đốt cháy giai đoạn (ví dụ: "làm người yêu mình nhé", "yêu anh không"): hãy bất ngờ, trêu đùa, hoặc từ chối khéo (ví dụ: "Ủa cậu đùa hay thật đấy haha, mới biết nhau mà đã đòi yêu đương rồi!"). TUYỆT ĐỐI không đồng ý làm người yêu ngay khi mới quen!
  + Nếu đối phương hỏi cung nhạt nhẽo: trả lời ngắn gọn, hơi giữ khoảng cách.
- TUYỆT ĐỐI KHÔNG lặp lại bất kỳ câu mô tả hay placeholder hướng dẫn nào. Hãy tự viết lời đối đáp của nhân vật.

VAI TRÒ 2: DATING COACH (CHUYÊN GIA TƯ VẤN GIAO TIẾP):
- Phân tích khách quan tin nhắn người dùng vừa gửi:
  + tone_evaluation: Đánh giá giọng điệu, nhịp điệu (có bị vồ vập, hỏi dồn dập, hay duyên dáng).
  + vibe_score: "positive" (duyên dáng, tốt) | "neutral" (bình thường, hơi nhạt) | "warning" (đốt cháy giai đoạn, vồ vập, hỏi cung, gây khó xử).
  + advice: 1-2 câu lời khuyên thiết thực giúp sửa sai hoặc duy trì nhịp tốt.
  + suggested_replies: 2 câu gợi ý người dùng có thể gửi tiếp theo để chữa cháy hoặc tiếp nối câu chuyện.

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
            f"Ơ kìa {persona.name} hơi bất ngờ đó nha! 😅 Tụi mình còn chưa biết nhiều về nhau mà, "
            f"sao đã vội đòi làm người yêu rồi? Cậu có đang đùa không đấy haha. "
            f"Tớ nghĩ chúng mình nên bắt đầu từ việc trò chuyện tìm hiểu xem có hợp vibe trước đã chứ!"
        )
        feedback = SimulationCoachFeedback(
            tone_evaluation="Bạn đang đi quá nhanh và đốt cháy giai đoạn. Việc tỏ tình hoặc đề nghị làm người yêu khi chưa có sự kết nối và tương tác chiều sâu sẽ tạo cảm giác vội vã, thiếu nghiêm túc và khiến đối phương phòng thủ.",
            vibe_score="warning",
            advice="Hãy hạ nhiệt ngay lập tức bằng một câu đùa nhẹ nhàng để xua tan cảm giác gượng gạo, sau đó kéo cuộc trò chuyện về các chủ đề sở thích thường ngày.",
            suggested_replies=[
                "Haha tớ trêu xem cậu phản ứng thế nào thôi! Chứ tớ cũng muốn tìm hiểu từ từ mà.",
                "Công nhận tớ hơi vội thật 😅 Thôi cho tớ xin rút lại câu đó, bắt đầu lại bằng ly cà phê làm quen nhé?",
            ],
        )
    else:
        target = f"Nghe thú vị ghê! Cậu có thể kể thêm cho {persona.name} nghe được không?"
        feedback = SimulationCoachFeedback(
            tone_evaluation="Tin nhắn tự nhiên, tạo được cảm giác thoải mái khi trò chuyện.",
            vibe_score="positive",
            advice="Hãy lắng nghe phản hồi của đối phương và đặt câu hỏi gợi mở để tìm điểm chung.",
            suggested_replies=[
                f"Thế thường vào cuối tuần {persona.name} hay làm gì để thư giãn?",
                "Tớ cũng có sở thích tương tự, hôm nào chia sẻ thêm nhé!",
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
