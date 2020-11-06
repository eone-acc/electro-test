import {  getLocalStorage, setLocalStorage } from './storage.js'

/* ===================== <Блок переменных (BEGIN)> ====================  */
const dbUrl = '../db/db.json';  //адрес БД
const userName = document.querySelector('.nav__user-info') //Элемент страницы с именем пользователя
const timerShow = document.querySelector('.timer'); //Элемент таймера
const prevBtn = document.querySelector('.prev-btn') // Кнопка назад
const nextBtn = document.querySelector('.next-btn') //Кнопка вперед
const submitBtn = document.querySelector('.submit-btn') //Кнопка ответить
const  controllButton = document.querySelector('.controll-block__button') //Кнопка старт/стоп

const mainSection = document.querySelector('.main-section')
// mainSection.style.display = 'none';

let answerListElements; //Переменная для перечня вариантов ответа активного вопроса

let testSettings = {}   //пользовательские переменные теста
let quantityInOneTest = 10; //количество вопросов в одном тесте
let currentQuestionIndex = 0; //индекс текущего вопроса из списка вопросов текущего теста
let timeToTestCompleate = 10 //время в минутах на вылолнения теста 
let currentQuestionData = {};  //данные тещего вопроса из бд
let currentQuestionUserData = {}  //переменная, которая хранит пользовательсую инфромацию по текущему вопросу
let finished = false; //отвечает за завещрение логики теста
let storageData; //объявляем переменную в которую будем помещать данные с вопросами из losalStorage 
let questionLenght; //узнаем количество вопросов в текущем тесте по длине списка объектов с вопросами 
let totalTimer = 0; //Секунды таймера

/* ===================== <Блок переменных (END) > ====================  */

/* ======================<Блок с функциями (BEGIN)>====================== */ 

//Создание нового пользователя в localStorage
const createNewUser = () => {
  let userLocalData = {    //пользовательские переменные теста
    name: prompt('Имя'),
    time: 10,
    questionQuantity: 10,
    totalTestCompleate: 0,
    averageScore: 0,
    lastTestScore: [0, 0],
    testedNow: false
  }
  setLocalStorage('userLocalData', userLocalData)
}

//Запрос к БД и выборка вопросов на тест
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
        //проверяем на наличие повторяющихся вопросов в списке тестов
        if (questionDataToTest.includes(item)) {
          item = questionData[Math.floor(Math.random() * questionData.length)]
        }
        questionDataToTest.push(item)
      }
      setLocalStorage("allQuestion", questionDataToTest)
      // console.log(questionDataToTest);      
      return questionData;
    })
    .catch(err => console.log("Ошибка", err))
}

//Функция, которая верстает HTML блок вопроса на основаниее полученного объекта данных вопроса
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

//Рендерит блок с вопросом по индексу в зависимости от условий
const reRenderCurrentQuestion = async (idx) => {
  //Проверяем если кол-во ответов равно кол-ву вопросов - завершаем тест
  if (getLocalStorage('userData').length === getLocalStorage('allQuestion').length ) { 
    finished = true;
  }
  await renderQuestion(storageData[idx]) // верстаем блок вопроса по из объекта по индексу
  answerListElements = document.querySelectorAll('.question-body__item') // Помещаем список с вариантами ответов 
  //Проверяем нет завершен ли тест 
  if (finished) { 
    //Получаем данные из ответов пользователя по qID текущего отрендеренного вопроса
    const comparisonUserData = await finishTest().userAnswers.filter(i => i.qID === currentQuestionData.qID ); 
    //Получаем данные из ответов БД по qID текущего отрендеренного вопроса
    const comparisonCorrectData = await finishTest().correctData.filter(i => i.qID === currentQuestionData.qID );
    //Запускае проверку правильности ответов 
    checkAnwser(comparisonCorrectData[0].answerText, comparisonUserData[0].userAnswers)    
    return
  }

    else if (answerListElements) { //Проверяем был ли ответ на этот вопрос
      const resultOfChecked = ifUserAllreadyConfirmAnswer() 
      if (resultOfChecked.length > 0) {
        markingConfirmedAns(resultOfChecked)


    }
    else {  //отметить вариант ответа по клику
      answerListElements.forEach(item => {
        item.addEventListener('click', () => {
          item.classList.toggle('question-body__item-checked');
        })
      })
    }
  }
}

//Функция которая проверяет получен ли ответ на текущий вопрос
const ifUserAllreadyConfirmAnswer = () => {
  const userDataFromStorage = getLocalStorage('userData')  //получаем данные ответов пользователя из localStorage 
  const currenstFromUserDataFromStorage = userDataFromStorage.filter(item => item.qID === currentQuestionData.qID)
  return currenstFromUserDataFromStorage
}

//Функция которая будет присваивать классы элементам вопроса, если уже на него был получен ответ и ставить галочку
const markingConfirmedAns = (itemToBlock) => {
  const tickMark = document.querySelector('.question-header__tick')
  tickMark.style.opacity = '1';
  answerListElements.forEach(item => {    
  if(itemToBlock[0].userAnswers.includes(+item.dataset.answerIndex)) {
    item.classList.toggle('question-body__item-checked');      
  }    
})
}

//Функция добавления ответа пользователя в storage
const appendToStorage = async(storageDataKey, storageDataValue) => {
  let oldStorageDataValue = await getLocalStorage(storageDataKey); //получаем текущие данные из storage
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
    // if (getLocalStorage('userData').length === getLocalStorage('allQuestion').length ) {
    //   finished = true;
    // }
  }
}

//Формирует блоки с ответами пользователя и контрольными ответами для алгоритма сравнения ответов
const finishTest = () => {
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

//Функция проверки ответа проверяет 2 массива на соответсвие друг другу
const checkAnwser = (correct, user) => {
  // console.log(correct, user); //Вывод в консоль сравнения результатов
  correct.forEach(i => {
    document.querySelector(`[data-answer-index="${i}"]`).classList.add('question-body__item-correct')
  })

  if (correct.length === user.length) {
    // console.log("Длина одинаковая");  //Вывод в консоль сравнения результатов
    // console.log("Далее сравниваем по соответствию..."); //Вывод в консоль сравнения результатов
    let result = user.filter(i => !correct.includes(i))
    if (result.length === 0) {
      // console.log("Ответ верен!"); //Вывод в консоль сравнения результатов
    } else if (result.length > 0) {
      // console.log('Есть над чем еще поработать!!!!'); //Вывод в консоль сравнения результатов
      result.forEach(i => {
        document.querySelector(`[data-answer-index="${i}"]`).classList.add('question-body__item-wrong')
      })
    }

  } else {
    // console.log("Длина разная"); //Вывод в консоль сравнения результатов
    // console.log("Далее сравниваем по соответствию..."); //Вывод в консоль сравнения результатов
    let result = user.filter(i => !correct.includes(i))
    result.forEach(i => {
      document.querySelector(`[data-answer-index="${i}"]`).classList.add('question-body__item-wrong')
    })
    // console.log('Есть над чем еще поработать!'); //Вывод в консоль сравнения результатов
  }
}

/* ======================<Блок с функциями (END)>====================== */ 

const startTesting = async () => {
  controllButton.closest(".controll-block").classList.remove('controll-block--zoomed');
  await setLocalStorage('timerSet', new Date().getTime() + 600000)
  totalTimer = await Math.round((getLocalStorage('timerSet') - new Date().getTime())/1000); //Секунды таймера
  const timer = setInterval(function () {
    let seconds = totalTimer%60 // Получаем секунды
    let minutes = totalTimer/60%60 // Получаем минуты
    let hour = totalTimer/60/60%60 // Получаем часы
    // Условие если время закончилось то...
    if (totalTimer <= 0) {
        // Таймер удаляется
        clearInterval(timer);
        // Выводит сообщение что время закончилось
        finished = true;
        if(currentQuestionData.length > 0) {
          reRenderCurrentQuestion(currentQuestionIndex) 
        }
        timerShow.innerHTML = '';
    } else { // Иначе
        // Создаём строку с выводом времени
        if (totalTimer < 60) {
          timerShow.style.color = 'red'
        }
        let strTimer = `${Math.trunc(minutes) < 10 ? '0' + Math.trunc(minutes) : Math.trunc(minutes)}:${seconds < 10 ? '0' + seconds : seconds}`;
        // Выводим строку в блок для показа таймера
        timerShow.innerHTML = `<span>${strTimer}</span>`;
    }
    --totalTimer; // Уменьшаем таймер
  }, 1000)
  storageData = getLocalStorage('allQuestion')
  reRenderCurrentQuestion(currentQuestionIndex)
}

  const stopTesting = async () => {
    await setLocalStorage('timerSet', new Date().getTime())
    totalTimer = 0
    const timer = setInterval(function () {
      let seconds = totalTimer%60 // Получаем секунды
      let minutes = totalTimer/60%60 // Получаем минуты
      let hour = totalTimer/60/60%60 // Получаем часы
      // Условие если время закончилось то...
      if (totalTimer <= 0) {
          // Таймер удаляется
          clearInterval(timer);
          // Выводит сообщение что время закончилось
          finished = true;
          if(currentQuestionData.length > 0) {
            reRenderCurrentQuestion(currentQuestionIndex) 
          }
          timerShow.innerHTML = '';
      } else { // Иначе
          // Создаём строку с выводом времени
          if (totalTimer < 60) {
            timerShow.style.color = 'red'
          }
          let strTimer = `${Math.trunc(minutes) < 10 ? '0' + Math.trunc(minutes) : Math.trunc(minutes)}:${seconds < 10 ? '0' + seconds : seconds}`;
          // Выводим строку в блок для показа таймера
          timerShow.innerHTML = `<span>${strTimer}</span>`;
      }
      --totalTimer; // Уменьшаем таймер
    }, 1000)
    mainSection.style.display = 'block';

  }



const initialize = async () => { //Иницализация 
  testSettings =  getLocalStorage('userLocalData') //записывым в переменную данные из карточки
  userName.innerText = testSettings.name //Устанавливаем актуальное имя из карточки
        
  if (await getLocalStorage('allQuestion').length === 0) {
    await pushDataOfDBToStorage();
    questionLenght = getLocalStorage('allQuestion').length;
    storageData = getLocalStorage('allQuestion');
  }

  if(!testSettings.testedNow) {
    controllButton.innerText = "Начать"
  } else {
    controllButton.innerText = "Завершить"
  }  
  
  //слушаем клик по кнопке старт/стоп
  controllButton.addEventListener('click', () => {
    if (!testSettings.testedNow) {
      //Запускаем тестирование
      console.log('STARTED');
      startTesting()
      
    }
    else if (testSettings.testedNow) {
      console.log('STOPED');
      stopTesting()
    }
    testSettings.testedNow = !testSettings.testedNow
  })  
}  



/* ======================<Блок с логикой> (BEGIN) ============================= */

//Для начала проверяем есть ли в localStorage 
if (getLocalStorage('userLocalData').length === 0) { //Если нет - то создаем. Если юзера еще небыло - то и вопросов быть не может, поэтому чистим localStorage 
  localStorage.clear()
  createNewUser() //Создаем карточку пользователя
  initialize()
}
else {   //в противном случае получаем данные для последующего рендера
  initialize()
}


if (getLocalStorage('testSettings')) {
  testSettings = getLocalStorage('testSettings')
}

//Предыдущий вопрос
prevBtn.addEventListener('click', async () => {
  if (currentQuestionIndex === 0) {
    return;
  }
  currentQuestionIndex--;
  await reRenderCurrentQuestion(currentQuestionIndex)
})

//Следующий вопрос
nextBtn.addEventListener('click', async () => {
  if (currentQuestionIndex + 1 === questionLenght) {
    return
  }
  currentQuestionIndex++;
  await reRenderCurrentQuestion(currentQuestionIndex)
})

//Подтвердить ответ
submitBtn.addEventListener('click', () => {  
  const checkedAnswer = document.querySelectorAll('.question-body__item-checked') //выбираем все отмеченные ответы в переменную
  if (!(getLocalStorage('userData').length === getLocalStorage('allQuestion').length ))
  {
    //Если пользователь отметил вариант ответа - тогда создаем список, с каждого элемента считываем dataset атрибут и заносим его в список
    if (checkedAnswer.length > 0) {    
      let userAnswers = [];
      checkedAnswer.forEach(item => {
        userAnswers.push(+item.dataset.answerIndex)
      })
      currentQuestionUserData = {};
      currentQuestionUserData.qID = currentQuestionData.qID; //присваиваем qID в currentQuestionUserData
      currentQuestionUserData.userAnswers = userAnswers; //добавляем в переменную currentQuestionUserData ответы пользователя
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


//Функция таймера

// const timer = setInterval(function () {
//   let seconds = totalTimer%60 // Получаем секунды
//   let minutes = totalTimer/60%60 // Получаем минуты
//   let hour = totalTimer/60/60%60 // Получаем часы
//   // Условие если время закончилось то...
//   if (totalTimer <= 0) {
//       // Таймер удаляется
//       clearInterval(timer);
//       // Выводит сообщение что время закончилось
//       finished = true;
//       if(currentQuestionData.length > 0) {
//         reRenderCurrentQuestion(currentQuestionIndex) 
//       }
//       timerShow.innerHTML = '';
//   } else { // Иначе
//       // Создаём строку с выводом времени
//       if (totalTimer < 60) {
//         timerShow.style.color = 'red'
//       }
//       let strTimer = `${Math.trunc(minutes) < 10 ? '0' + Math.trunc(minutes) : Math.trunc(minutes)}:${seconds < 10 ? '0' + seconds : seconds}`;
//       // Выводим строку в блок для показа таймера
//       timerShow.innerHTML = `<span>${strTimer}</span>`;
//   }
//   --totalTimer; // Уменьшаем таймер
// }, 1000)