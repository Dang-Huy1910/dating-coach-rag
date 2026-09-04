from __future__ import annotations

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


SIMULATION_SYSTEM_PROMPT = f"""You are an advanced Dating Communication Simulation Engine with two distinct personas:
1. TARGET PERSONA (Roleplay): You roleplay as a real person that the user matched with on a dating app. Follow the specified Persona profile (name, age, vibe, messaging style) strictly. Reply authentically, with genuine human emotion, slang/style fitting the persona. NEVER break character in the target_reply.
2. DATING COACH (Evaluator): As an expert dating communication coach grounded in the provided knowledge base, you objectively analyze the user's latest message and give constructive, encouraging feedback in Vietnamese.

Safety boundary:
- No NSFW, no explicit romantic/erotic content, no harassment. If the user sends inappropriate sexual content, the target persona must politely pull back or set a clear boundary.
- Respect product disclaimer: {DISCLAIMER_TEXT}

Respond ONLY with a valid JSON object with the following structure:
{{
  "target_reply": "Tin nhắn trả lời từ phía đối tượng (nhập vai 100% tự nhiên theo Persona, tiếng Việt)",
  "coach_feedback": {{
    "tone_evaluation": "1-2 câu nhận xét ngắn gọn về thái độ, giọng điệu và mức độ áp lực trong tin nhắn của bạn",
    "vibe_score": "positive | neutral | warning",
    "advice": "1-2 câu lời khuyên thiết thực từ Coach giúp duy trì kết nối tự nhiên, không vồ vập",
    "suggested_replies": [
      "Câu gợi ý 1 bạn có thể gửi tiếp theo",
      "Câu gợi ý 2 tự nhiên và duyên dáng"
    ]
  }}
}}
"""


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
    for msg in request.messages[-10:]:
        sender = "Bạn (User)" if msg.role == "user" else f"{persona.name} (Target)"
        history_lines.append(f"{sender}: {msg.content}")
    dialogue_history = "\n".join(history_lines)

    user_prompt = f"""=== THÔNG TIN ĐỐI TƯỢNG (TARGET PERSONA) ===
- Tên: {persona.name} ({persona.age} tuổi)
- Tính cách & Vibe: {persona.vibe_description}
- Phong cách nhắn tin: {persona.messaging_style}

=== TRI THỨC HUẤN LUYỆN HẸN HÒ (RAG KNOWLEDGE) ===
{excerpts_text or "(Thư viện cơ bản: giữ nhịp tương tác cân bằng, câu hỏi mở, không hỏi dồn)"}

=== LỊCH SỬ ĐOẠN CHAT VỪA QUA ===
{dialogue_history}

Hãy tạo phản hồi:
1. Nhập vai {persona.name} để trả lời tin nhắn cuối của Bạn một cách chân thật nhất.
2. Với tư cách Dating Coach, phân tích tin nhắn vừa rồi của Bạn và đưa ra feedback hữu ích.

Trả về định dạng JSON hợp lệ duy nhất."""

    raw_response = complete(
        f"{SIMULATION_SYSTEM_PROMPT}\n\n{user_prompt}"
    )

    parsed = _parse_model_json(raw_response)

    target_reply = str(parsed.get("target_reply") or "").strip()
    if not target_reply:
        # Fallback if model put reply in generic key
        target_reply = str(parsed.get("reply") or f"Chào bạn! Rất vui được nói chuyện cùng bạn.").strip()

    feedback_raw = parsed.get("coach_feedback")
    if not isinstance(feedback_raw, dict):
        feedback_raw = {}

    vibe_score = feedback_raw.get("vibe_score")
    if vibe_score not in {"positive", "neutral", "warning"}:
        vibe_score = "positive"

    tone_eval = str(
        feedback_raw.get("tone_evaluation")
        or "Tin nhắn tự nhiên, thể hiện sự quan tâm đúng mực."
    ).strip()

    advice = str(
        feedback_raw.get("advice")
        or "Hãy tiếp tục lắng nghe và mở rộng câu chuyện dựa trên câu trả lời của đối phương."
    ).strip()

    suggested = feedback_raw.get("suggested_replies")
    suggested_list = [str(s).strip() for s in suggested if str(s).strip()] if isinstance(suggested, list) else []
    if not suggested_list:
        suggested_list = [
            f"Thế còn bạn thì sao, thường thích làm gì vào những ngày rảnh rỗi?",
            f"Nghe thú vị thật đấy, bạn có thể kể thêm về trải nghiệm đó không?",
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
