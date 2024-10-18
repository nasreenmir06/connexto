// this is a test
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [inputRows, setInputRows] = useState([['', '', '', '', '']]);
  const [startLetter, setStartLetter] = useState('');
  const [endLetter, setEndLetter] = useState('');
  const [similarityScore, setSimilarityScore] = useState([]);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('easy');
  const [hint, setHint] = useState('');
  const [hintVisible, setHintVisible] = useState(false);
  const [scoreVisible, setScoreVisible] = useState(false);
  const [score, setScore] = useState(0);

  
  const letters = 'abcdefghiklmnoprstuwxyz'.toUpperCase().split('');

  useEffect(() => {
    // Fetch the daily letters from the backend
    fetch('http://127.0.0.1:5000/get_daily_letters')
      .then(response => response.json())
      .then(data => {
        setStartLetter(data.start_letter);
        setEndLetter(data.end_letter);
      })
      .catch(error => {
        console.error('Error fetching daily letters:', error);
      });

    document.getElementById('input-1-1')?.focus();
  }, []);

  useEffect(() => {
    const initialMode = new URLSearchParams(window.location.search).get('mode');
    if (initialMode) {
      setMode(initialMode);
    }
  }, []);

  const toggleMode = () => {
    const newMode = mode === 'easy' ? 'hard' : 'easy';
    setMode(newMode);
    window.location.href = window.location.pathname + '?mode=' + newMode;
  };

  const handleInput = (rowIndex, letterIndex, value) => {
    setError(''); 
    
    const regex = /^[a-zA-Z]+$/;
    if (value.length > 0 && regex.test(value)) {
        const newRows = [...inputRows];
        newRows[rowIndex][letterIndex] = value.toUpperCase();
        setInputRows(newRows);
    
        if (letterIndex < 4) {
            const nextInput = document.getElementById(`input-${rowIndex}-${letterIndex + 1}`);
            if (nextInput) {
                nextInput.focus();
            }
        } else if (letterIndex === 4) {
            const firstCondition = inputRows.length === 1;
            const secondCondition = rowIndex > 0 && inputRows[rowIndex - 1][4] === newRows[rowIndex][0];
    
            if (firstCondition || secondCondition) {
                setError(''); // Clear any previous error before validating the word
                validateWord(rowIndex);
            } else {
                setError('Please input a word where the start letter is the last letter of the previous word.');
            }
        }
    } else if (value.length === 0 && letterIndex > 0) {
        // Allow backspace even when there's an error
        const currentElement = document.getElementById(`input-${rowIndex}-${letterIndex}`);
        handleBackspace(rowIndex, letterIndex, currentElement, true);
    }
  };
  
  const validateWord = (rowIndex) => {
    const word1 = inputRows[rowIndex].join('').toLowerCase();
    fetch(`http://127.0.0.1:5000/validate_word?word=${word1}`)
      .then(response => response.json())
      .then(data => {
        if (data.result === 'Valid word') {
          console.log("num of guesses: " + inputRows.length);
          if (rowIndex !== 0) {
            const word2 = inputRows[rowIndex - 1].join('').toLowerCase();
            fetch(`http://127.0.0.1:5000/similarity?word1=${word1}&word2=${word2}`)
              .then(response => response.json())
              .then(data => {
                setSimilarityScore([...similarityScore, data.similarity]);
                console.log(data.similarity);

                if (inputRows[rowIndex][4].toUpperCase() === endLetter.toUpperCase()) {
                  calculateScore();
                } else {
                  generateNewRow();
                }
              })
              .catch(error => console.error('Error:', error));
          } else {
            if (inputRows[rowIndex][4].toUpperCase() === endLetter.toUpperCase()) {
              calculateScore();
            } else {
              generateNewRow();
            }
          }
        } else {
          setError('Invalid word. Please try again.');
        }
      })
      .catch(error => console.error('Error:', error));
  };

  const generateNewRow = () => {
    setInputRows([...inputRows, ['', '', '', '', '']]);
    setTimeout(() => {
      document.getElementById(`input-${inputRows.length}-0`)?.focus();
    }, 0);
  };

  const handleBackspace = (rowIndex, letterIndex, clearCurrent = false) => {
    const newRows = [...inputRows];

    if (clearCurrent) {
      // Clear the current input box
      newRows[rowIndex][letterIndex] = '';
      setInputRows(newRows);
      document.getElementById(`input-${rowIndex}-${letterIndex}`)?.focus();
      
  } else if (letterIndex > 0 && !clearCurrent) {
        newRows[rowIndex][letterIndex-1] = '';
        setInputRows(newRows);
        document.getElementById(`input-${rowIndex}-${letterIndex - 1}`)?.focus();
    } else if (rowIndex > 0 && !clearCurrent) {
        const prevRow = rowIndex - 1;
        newRows[prevRow][4] = '';  
        setInputRows(newRows);
        
        newRows.pop();
        setInputRows(newRows);
        
        setTimeout(() => {
            const lastInputInPrevRow = document.getElementById(`input-${prevRow}-4`);
            lastInputInPrevRow?.focus();
        }, 0);
    }
};

  const calculateScore = () => {
    console.log("win game!");
    const sum = similarityScore.reduce((acc, val) => acc + val, 0);
    const avg = sum / (similarityScore.length + 1);
    const Cmin = -0.2;
    const Cmax = 0.6;
    const a = 6;

    let finalScore;
    if (mode === 'hard' && inputRows.length > 1) {
      finalScore = (100/(1+(similarityScore.length))) * ((avg-Cmin)/(Cmax-Cmin) ** a);
    } else if (inputRows.length === 1) {
      finalScore = 100;
    } else {
      finalScore = 100 - (20 * (inputRows.length - 1));
    }
    setScore(finalScore); 
    setScoreVisible(true);
    console.log("Score: " + String(finalScore));
  };  

  const fetchHint = () => {
    fetch(`http://127.0.0.1:5000/get_hint?letter=${endLetter.toLowerCase()}`)
        .then(response => response.json())
        .then(data => {
          if (data.word) {
            setHint(`Here’s a word that ends with ${endLetter}: ${data.word}`);
          } else {
            setHint(`No hints available for words ending with ${endLetter}.`);
          }
          setHintVisible(true);
        })
        .catch(error => console.error('Error fetching hint:', error));
  };
  
  return (
    <div className="App">
      <div style={{ width: '100%' }}>
      <nav className="navbar navbar-expand-lg navbar-light bg-light w-100">
        <div className="container-fluid d-flex justify-content-between">
          <a className="navbar-brand" href="#">Connexto</a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
            <ul className="navbar-nav">
              <li className="nav-item position-relative">
                <a className="nav-link active" aria-current="page" href="#">Instructions</a>
                <div className="hover-text">
                Enter words that start with the last letter of the previous word. You have been given a starting letter, and an end goal letter. In easy mode, your score is calculated solely by how many words it takes you to reach the end letter. In hard mode, your score is calculated by how many words you used to reach the end letter, along with a “context score” - the similarity between the word you entered and the previous word. A hint will give you a word that ends with the goal letter, and can be obtained by solving a puzzle in one word (NOTE: not always possible).
                </div>
              </li>
              <li className="nav-item position-relative">
                <a className="nav-link active" href="#">Contact</a>
                <div className="hover-text">
                  Questions, concerns, suggestions? Email me: nasreenmir06@gmail.com
                </div>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      </div>
  
      <div className="container">
        <div
          className={`score-display text-center p-3 mb-4 rounded ${
            scoreVisible ? '' : 'd-none'
          }`}
        >
          <p>Number of Words Guessed: {inputRows.length}</p>
          <p>Score: {Math.round(score)}</p>
        </div>
  
        <div className="form-check form-switch d-flex justify-content-center mb-4">
          <input
            className="form-check-input"
            type="checkbox"
            id="toggleMode"
            checked={mode === 'hard'}
            onChange={toggleMode}
          />
          <label className="form-check-label ms-2" htmlFor="toggleMode">
            {mode === 'easy' ? 'Easy' : 'Hard'}
          </label>
        </div>
  
        <div className="header text-center mb-4">
          <div className="hint-container">
            {!hintVisible ? (
              <button className="btn btn-info" onClick={fetchHint}>
                Hint
              </button>
            ) : (
              <p className="hint-text">{hint}</p>
            )}
          </div>
        </div>

        <div className="game-container text-center">
          <div className="row mb-4">
            <div id="startLetterRow" className="letter-box col-12">{startLetter}</div>
          </div>
  
          <div id="inputRows">
            {inputRows.map((row, rowIndex) => (
              <div key={rowIndex} className="row mb-3" id={`row-${rowIndex + 1}`}>
                {row.map((letter, letterIndex) => (
                  <div key={letterIndex} className="col">
                    <input
                      id={`input-${rowIndex}-${letterIndex}`}
                      type="text"
                      maxLength="1"
                      value={letter}
                      className="form-control text-center"
                      onChange={(e) => handleInput(rowIndex, letterIndex, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !letter) {
                          handleBackspace(rowIndex, letterIndex);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
  
          <div className="row mb-4">
            <div id="endLetterRow" className="letter-box col-12">{endLetter}</div>
          </div>
        </div>
  
        {error && <p className="alert alert-danger mt-4">{error}</p>}
      </div>
    </div>
  );
  
  
}

export default App;







