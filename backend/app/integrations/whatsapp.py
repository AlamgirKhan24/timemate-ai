import httpx

from app.core.config import settings

GRAPH_URL = "https://graph.facebook.com/v25.0"


class WhatsAppError(Exception):
    pass


def send_template(to, template_name="hello_world", language="en_US", body_params=None):
    if not settings.whatsapp_token or not settings.whatsapp_phone_number_id:
        raise WhatsAppError("WhatsApp token or phone number ID is missing")
    if not to:
        raise WhatsAppError("No recipient number given")

    template = {"name": template_name, "language": {"code": language}}
    if body_params:
        template["components"] = [
            {
                "type": "body",
                "parameters": [{"type": "text", "text": p} for p in body_params],
            }
        ]

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": template,
    }
    url = f"{GRAPH_URL}/{settings.whatsapp_phone_number_id}/messages"
    headers = {"Authorization": f"Bearer {settings.whatsapp_token}"}

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=15)
    except httpx.HTTPError as exc:
        raise WhatsAppError(f"Network error: {exc.__class__.__name__}") from exc

    if response.status_code >= 400:
        try:
            detail = response.json()["error"]["message"]
        except Exception:
            detail = response.text[:200]
        raise WhatsAppError(f"WhatsApp API error {response.status_code}: {detail}")

    return response.json()["messages"][0]["id"]
