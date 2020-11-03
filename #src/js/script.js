import {
  getLocalStorage,
  setLocalStorage
} from './storage.js'

const dbUrl = '../db/db.json';

let quantityInOneTest = 10; //количество вопросов в одном тесте
let currentQuestionIndex = 0;
let answerListElements;

let currentQuestionData = {};

let currentQuestionUserData = {
  // qID: {userAnswer: [],}
}

let finished = false; //отвечает за завещрение логики теста

const pushDataOfDBToStorage = async () => {
  await fetch(dbUrl)
    .then(res => res.json())
    .then(data => {
      let questionData = []; //вся база с вопросами
      let questionDataToTest = []; //вопросы в тест
      let idx = 0;
      data.forEach(item => {
        item.data.forEach((q) => {
          q.questionCharpter = item.testCharpter;
          q.qID = idx;
          idx++;
          questionData.push(q)
        })
      })

      for (let i in [...Array(quantityInOneTest).keys()]) {
        let item = questionData[Math.floor(Math.random() * questionData.length)]
        if (questionDataToTest.includes(item)) {
          console.log('Уже есть!');
          item = questionData[Math.floor(Math.random() * questionData.length)]

        }
        questionDataToTest.push(item)
      }
      console.log('questionDataToTest', questionDataToTest);

      setLocalStorage("allQuestion", questionDataToTest)
      return questionData;
    })
    .catch(err => console.log("Ошибка", err))
}

pushDataOfDBToStorage();

const storageData = getLocalStorage("allQuestion");
const questionLenght = storageData.length;


//Функция которая проверяет получен ли ответ на текущий вопрос
function ifUserAllreadyConfirmAnswer() {
  const userDataFromStorage = getLocalStorage('userData')
  const currenstFromUserDataFromStorage = userDataFromStorage.filter(item => item.qID === currentQuestionIndex)
  return currenstFromUserDataFromStorage
}

//Функция которая будет присваивать классы элементам вопроса, если уже на него был получен ответ
function markingConfirmedAns(itemToBlock) {
    const tickMark = document.querySelector('.question-header__tick')
    tickMark.style.opacity = '1';
    answerListElements.forEach(item => {    
    if(itemToBlock[0].userAnswers.includes(+item.dataset.answerIndex)) {
      item.classList.toggle('question-body__item-checked');      
    }    
  })
}



//Функция добавления ответа пользователя в storage
async function appendToStorage(storageDataKey, storageDataValue) {
  let oldStorageDataValue = await getLocalStorage(storageDataKey);
  let newObj = [];
  if (oldStorageDataValue.length === 0) {
    newObj.push(storageDataValue)
    setLocalStorage(storageDataKey, newObj)
  } else {
    newObj = [];
    oldStorageDataValue.forEach(item => {
      newObj.push(item)
    })
    newObj.push(storageDataValue)    
    setLocalStorage(storageDataKey, newObj)
    if (getLocalStorage('userData').length === getLocalStorage('allQuestion').length ) {
      finished = true;
    }
  }
}


//Функция, которая рендерит блок с вопросом. Принимает в качестве данных объект вопроса
const renderQuestion = async (data) => {

  currentQuestionData.qID = data.qID;
  let correctAnswer = [];
  data.answerText.forEach((item, idx) => {
    if (item.isCorrect === 'true') {
      correctAnswer.push(idx)
    }
  })
  currentQuestionData.correctAnswer = correctAnswer;


  const questionCard = document.querySelector('.question-block');
  questionCard.innerHTML = '';
  let renderItemQuestionBlock = '';

  for (let [idx, item] of data.answerText.entries()) {
    renderItemQuestionBlock += `
      <div class="question-body__item" data-answer-index = ${idx}>
        <span>${+item.num+1}.</span>
        <p>${item.text}</p>
      </div>
    `
  }

  let renderItem = ` 
    <div class="question-header">
      <div class="question-header__commit"><div class="question-header__tick"></div> </div>
      <div class="question-header__question">
        <div class="question-header__question-title"><h3>${data.questionCharpter}</h3></div>
        <div class="question-header__text"><p>${data.questionName}</p></div>
        <div class="question-header__text"><p>${data.questionText}</p></div>
      </div>
      <div class="question-header__eachof"><span>${currentQuestionIndex+1} из ${questionLenght}</span></div>
      </div>
      <div class="question-body">
        ${renderItemQuestionBlock}
      </div>
  `;
  questionCard.innerHTML = await renderItem;
};



//Рендерит блок с вопросом по индексу, который принимает в вызове функции из массива, который вернула функция getAllDataOfDB()
const reRenderCurrentQuestion = async (idx) => {
  if (getLocalStorage('userData').length === getLocalStorage('allQuestion').length ) {
    finished = true;
  }
  await renderQuestion(storageData[idx])
  answerListElements = document.querySelectorAll('.question-body__item')

  if (finished) {
    const comparisonUserData = await finishTest().userAnswers.filter(i => i.qID === currentQuestionIndex )
    const comparisonCorrectData = await finishTest().correctData.filter(i => i.qID === currentQuestionIndex )
    checkAnwser(comparisonCorrectData[0].answerText, comparisonUserData[0].userAnswers)    
    return
  }

  else if (answerListElements) {
    const resultOfChecked = ifUserAllreadyConfirmAnswer()
    if (resultOfChecked.length > 0) {
      markingConfirmedAns(resultOfChecked)


    }
    else {
      answerListElements.forEach(item => {
        item.addEventListener('click', () => {
          item.classList.toggle('question-body__item-checked');
        })
      })
    }
  }
}

//Функция проверки ответа проверяет 2 массива на соответсвие друг другу
const checkAnwser = (correct, user) => {
  console.log(correct, user);
  correct.forEach(i => {
    document.querySelector(`[data-answer-index="${i}"]`).classList.add('question-body__item-correct')
  })

  if (correct.length === user.length) {
    console.log("Длина одинаковая");
    console.log("Далее сравниваем по соответствию...");
    let result = user.filter(i => !correct.includes(i))
    if (result.length === 0) {
      console.log("Ответ верен!");
    } else if (result.length > 0) {
      console.log('Есть над чем еще поработать!!!!');
      result.forEach(i => {
        document.querySelector(`[data-answer-index="${i}"]`).classList.add('question-body__item-wrong')
      })
    }

  } else {
    console.log("Длина разная");
    console.log("Далее сравниваем по соответствию...");
    let result = user.filter(i => !correct.includes(i))
    result.forEach(i => {
      document.querySelector(`[data-answer-index="${i}"]`).classList.add('question-body__item-wrong')
    })
    console.log('Есть над чем еще поработать!');
  }
}

reRenderCurrentQuestion(currentQuestionIndex)


const prevBtn = document.querySelector('.prev-btn')
const nextBtn = document.querySelector('.next-btn')
const submitBtn = document.querySelector('.submit-btn')


prevBtn.addEventListener('click', async () => {
  if (currentQuestionIndex === 0) {
    return;
  }
  currentQuestionIndex--;

  await reRenderCurrentQuestion(currentQuestionIndex)

})

nextBtn.addEventListener('click', async () => {
  if (currentQuestionIndex + 1 === questionLenght) {
    return
  }
  currentQuestionIndex++;
  await reRenderCurrentQuestion(currentQuestionIndex)

})
function checkLength() {
  let someVar = getLocalStorage('userData')
  console.log(someVar.length);
}



submitBtn.addEventListener('click', () => {  
  const checkedAnswer = document.querySelectorAll('.question-body__item-checked')
  if (!(getLocalStorage('userData').length === getLocalStorage('allQuestion').length )) {
    
  
  if (checkedAnswer.length > 0) {
    let userAnswers = [];
    checkedAnswer.forEach(item => {
      userAnswers.push(+item.dataset.answerIndex)
    })

    currentQuestionUserData.qID = currentQuestionData.qID;
    currentQuestionUserData.userAnswers = userAnswers;
    if (ifUserAllreadyConfirmAnswer().length > 0) {
      return;
    } else {
      appendToStorage('userData', currentQuestionUserData);
    }
  } else {
    alert('Выберите вариант ответа!')
    return
  }
  if (currentQuestionIndex + 1 === questionLenght) {  
    reRenderCurrentQuestion(currentQuestionIndex)
    return 
  }
  currentQuestionIndex++;
  reRenderCurrentQuestion(currentQuestionIndex)
 } 
})

function clearStorage() {
  window.localStorage.clear()
}

function finishTest() {
  //Блок формирует из localStorage переменные с ответами (правильные и пользовательские)
  let userAnswers = getLocalStorage('userData');
  const questionsDataFromStorage = getLocalStorage('allQuestion')  
  let correctData = [];
  let correctAns = []
  questionsDataFromStorage.forEach(item => {
   delete item.questionCharpter
   delete item.questionText
   delete item.questionName
   item.answerText.forEach(i => {
     if (i.isCorrect === "true") {      
      correctAns.push(+i.num)
     }
   })
   item.answerText = correctAns
   correctData.push(item)
   correctAns = []
  })
  if (userAnswers.length != correctData.length) {
    let alreadyChecked = []
    userAnswers.forEach(i => {
      alreadyChecked.push(i.qID)
    })
    correctData.forEach( itm => {
        if (!alreadyChecked.includes(itm.qID)) {
        userAnswers.push(
          {
            qID : itm.qID,
             userAnswers: []
            }
        )
      }
    })
  }
  return {'userAnswers': userAnswers, 'correctData': correctData}




}

const clearStorageBtn = document.querySelector('.btn-1');
const endTestBtn = document.querySelector('.btn-2');
const someOneBtn = document.querySelector('.btn-3');

someOneBtn.addEventListener('click', () => {
  checkLength()
})

clearStorageBtn.addEventListener('click', () => {
  clearStorage()  
})

endTestBtn.addEventListener('click', () => {
  finished = true;
  reRenderCurrentQuestion(currentQuestionIndex)
})



