
# Example Request

Method: 		POST
URL: 			http://localhost:3000/v1/summaries


## Headers

Authorization: 	Bearer key1

Content-Type: 	application/json

Body (raw → JSON)
{
  "tenantId": "clinic-abc",
  "note": {
    "raw": "Client reports increased anxiety this week due to work deadlines. They slept 4-5 hours nightly. Clinician observed fidgeting and rapid speech. No self-harm or suicidal thoughts were mentioned. Discussed grounding techniques and scheduling breaks. Plan: practice grounding twice daily and follow up next week."
  },
  "options": {
    "soap": true,
    "plainLanguage": true,
    "temperature": 0.2
  }
}



## Notes (important!)

TenantId in the body is optional. If you include it, it must match the tenant implied by the API key or you’ll get 403. See .env for the keys list ( TENANT_KEYS_JSON ).

Temperature is capped server-side to 0.2 anyway.



# Example Response

{
  "requestId": "ae514c4d-161e-4edc-ba81-4438af867e30",
  "tenantId": "clinic-abc",
  "outputs": {
    "soapClinicalSummary": {
      "subjective": "Patient reports headache for 3 days....",
      "objective": "Not specified in transcript...",
      "assessment": "Clinical impression indicates a recent onset of headache...",
      "plan": ["Monitor headache symptoms","Consider over-the-counter pain relief options","Follow up if symptoms persist or worsen"]
    },
    "plainLanguageSummary": "You mentioned that you have been experiencing a headache ... It's important to monitor ... Please take care of yourself, and don't hesitate to seek help if you need it."
  },
  "metadata": {
    "model": "azure",
    "latencyMs": 6381,
    "usage": {
      "soap": { "prompt_tokens": 389, "completion_tokens": 94, "total_tokens": 483 },
      "plain": { "prompt_tokens": 109, "completion_tokens": 78, "total_tokens": 187 }
    }
  }
}
