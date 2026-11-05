from datetime import datetime, timedelta, timezone


def when(hours):
    moment = datetime.now(timezone.utc) + timedelta(hours=hours)
    return moment.strftime("%Y-%m-%dT%H:%M:%S")


def create_task(client, headers, hours=24, title="Study"):
    r = client.post("/tasks", json={"title": title, "start_at": when(hours)}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_register_login_and_me(client, make_user):
    headers = make_user()
    r = client.get("/users/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["email"] == "user@example.com"
    assert "password" not in r.text


def test_duplicate_email_rejected(client, make_user):
    make_user()
    r = client.post(
        "/auth/register",
        json={"name": "Other", "email": "user@example.com", "password": "password123"},
    )
    assert r.status_code == 400


def test_wrong_password_rejected(client, make_user):
    make_user()
    r = client.post("/auth/login", data={"username": "user@example.com", "password": "wrong-password"})
    assert r.status_code == 401


def test_invalid_timezone_rejected(client, make_user):
    r = client.post(
        "/auth/register",
        json={"name": "Bad Zone", "email": "zone@example.com", "password": "password123", "timezone": "Mars/Base"},
    )
    assert r.status_code == 422
    headers = make_user()
    r = client.put("/users/me", json={"timezone": "Mars/Base"}, headers=headers)
    assert r.status_code == 422


def test_tasks_require_login(client):
    assert client.get("/tasks").status_code == 401


def test_task_create_edit_delete(client, make_user):
    headers = make_user()
    task = create_task(client, headers)
    r = client.put(f"/tasks/{task['id']}", json={"status": "completed"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "completed"
    assert client.delete(f"/tasks/{task['id']}", headers=headers).status_code == 204
    assert client.get(f"/tasks/{task['id']}", headers=headers).status_code == 404


def test_user_cannot_see_or_change_another_users_task(client, make_user):
    alice = make_user("alice@example.com")
    bob = make_user("bob@example.com")
    task = create_task(client, alice)

    assert client.get(f"/tasks/{task['id']}", headers=bob).status_code == 404
    assert client.put(f"/tasks/{task['id']}", json={"title": "Hacked"}, headers=bob).status_code == 404
    assert client.delete(f"/tasks/{task['id']}", headers=bob).status_code == 404
    assert client.get("/tasks", headers=bob).json() == []
    assert client.get(f"/tasks/{task['id']}", headers=alice).json()["title"] == "Study"


def test_reminder_created_once_per_offset(client, make_user):
    headers = make_user()
    task = create_task(client, headers)
    body = {"task_id": task["id"], "offset_minutes": 30}
    assert client.post("/reminders", json=body, headers=headers).status_code == 201
    assert client.post("/reminders", json=body, headers=headers).status_code == 409


def test_reminder_in_the_past_rejected(client, make_user):
    headers = make_user()
    task = create_task(client, headers, hours=-2)
    r = client.post("/reminders", json={"task_id": task["id"], "offset_minutes": 0}, headers=headers)
    assert r.status_code == 400


def test_user_cannot_add_reminder_to_another_users_task(client, make_user):
    alice = make_user("alice@example.com")
    bob = make_user("bob@example.com")
    task = create_task(client, alice)
    r = client.post("/reminders", json={"task_id": task["id"], "offset_minutes": 0}, headers=bob)
    assert r.status_code == 404