from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import random
import string
import pytz
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# Global variables to store daily letters and the time they were generated
start_letter = ''
end_letter = ''
last_reset_time = None

# Helper function to get a random letter excluding 'J', 'Q', and 'V'
def get_random_letter_excluding_jqv():
    letters = string.ascii_uppercase.replace('J', '').replace('Q', '').replace('V', '')
    return random.choice(letters)

# Function to reset the letters at 12am EST
def reset_daily_letters():
    global start_letter, end_letter, last_reset_time
    est = pytz.timezone('US/Eastern')
    now = datetime.now(est)
    # Check if it's a new day
    if last_reset_time is None or now.date() != last_reset_time.date():
        start_letter = random.choice(string.ascii_uppercase)
        end_letter = get_random_letter_excluding_jqv()
        last_reset_time = now

# Endpoint to get the daily letters
@app.route('/get_daily_letters', methods=['GET'])
def get_daily_letters():
    reset_daily_letters()  # Ensure the letters are up to date
    return jsonify({
        'start_letter': start_letter,
        'end_letter': end_letter
    })

def validate_word_in_file(word):
    try:
        with open('/Users/nasreen/Downloads/connexto-game/data/5letterwords.txt', 'r') as file:
            words = file.read().splitlines()
            if word.lower() in words:
                return "Valid word"
            else:
                return "Invalid word"
    except FileNotFoundError:
        return "File not found"
    
@app.route('/get_hint', methods=['GET'])
def get_hint():
    with open('/Users/nasreen/Downloads/connexto-game/data/5letterwords.txt', 'r') as file:
        words = [word.strip() for word in file.readlines()]
    letter = request.args.get('letter', '').lower()
    matching_words = [word for word in words if word.endswith(letter)]
    
    if matching_words:
        hint_word = matching_words[0]  # You can use any method to select a word, here we just pick the first one
        return jsonify({"word": hint_word})
    else:
        return jsonify({"word": None})
    
@app.route('/validate_word', methods=['GET'])
def validate_word():
    word = request.args.get('word')
    result = validate_word_in_file(word)
    return jsonify({"result": result})

def load_glove_vectors(filepath):
    glove_dict = {}
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            values = line.split()
            word = values[0]
            vector = np.asarray(values[1:], dtype='float32')
            glove_dict[word] = vector
    return glove_dict

def cosine_similarity(vec1, vec2):
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

glove_vectors = load_glove_vectors('/Users/nasreen/Downloads/connexto-game/data/glove.6B/glove.6B.100d.txt')

@app.route('/')
def home():
    return "Welcome to the Word Similarity API!"

@app.route('/similarity', methods=['GET'])
def get_similarity():
    word1 = request.args.get('word1')
    word2 = request.args.get('word2')
    
    vec1 = glove_vectors.get(word1)
    vec2 = glove_vectors.get(word2)
    
    if vec1 is not None and vec2 is not None:
        similarity_score = float(cosine_similarity(vec1, vec2))  
        return jsonify({'similarity': similarity_score})
    else:
        return jsonify({'error': 'One or both words not found in the GloVe dictionary'}), 404

if __name__ == '__main__':
    app.run(debug=True)

