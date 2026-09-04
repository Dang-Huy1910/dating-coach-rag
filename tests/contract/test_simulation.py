def test_list_simulation_personas(client):
    response = client.get("/v1/simulation/personas")
    assert response.status_code == 200
    personas = response.json()
    assert isinstance(personas, list)
    assert len(personas) >= 3
    assert any(p["id"] == "linh-introvert" for p in personas)


def test_simulation_chat_contract(client, stub_hits, monkeypatch):
    mock_reply = (
        '{"target_reply": "Chào bạn nhé! Mình vừa đọc xong một cuốn sách khá hay.", '
        '"coach_feedback": {"tone_evaluation": "Mở đầu nhẹ nhàng, lịch thiệp.", '
        '"vibe_score": "positive", "advice": "Hỏi thêm về cuốn sách.", '
        '"suggested_replies": ["Sách gì vậy bạn?"]}}'
    )
    monkeypatch.setattr("backend.app.simulation.complete", lambda _prompt: mock_reply)

    personas = client.get("/v1/simulation/personas").json()
    persona = personas[0]

    payload = {
        "persona": persona,
        "messages": [
            {"role": "user", "content": "Chào Linh, chúc bạn một ngày tốt lành nhé!"}
        ],
    }

    response = client.post("/v1/simulation/chat", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "target_reply" in body
    assert "coach_feedback" in body
    assert body["coach_feedback"]["vibe_score"] == "positive"
    assert len(body["coach_feedback"]["suggested_replies"]) >= 1
