import requests

url = 'http://127.0.0.1:5000/stream_generate'
data = {'report_text': 'Patient presents with a dull headache and slight cough for 2 days. No fever, normal blood pressure.'}

try:
    response = requests.post(url, data=data, stream=True)
    for line in response.iter_lines():
        if line:
            print(line.decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
