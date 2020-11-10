import {  getLocalStorage, setLocalStorage } from './storage.js'

/* ===================== <Блок переменных (BEGIN)> ====================  */
const dbUrl = '../db/db.json';  //адрес БД
const userName = document.querySelector('.nav__user-info') //Элемент страницы с именем пользователя
const timerShow = document.querySelector('.timer'); //Элемент таймера
const prevBtn = document.querySelector('.prev-btn') // Кнопка назад
const nextBtn = document.querySelector('.next-btn') //Кнопка вперед
const submitBtn = document.querySelector('.submit-btn') //Кнопка ответить
const controllButton = document.querySelector('.controll-block__button') //Кнопка старт/стоп
let timer;


const mainSection = document.querySelector('.main-section')
mainSection.style.display = 'none';

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
let stat = [0 , 0] // результат сравнения ответов
/* ===================== <Блок переменных (END) > ====================  */

/* ======================<Блок с функциями (BEGIN)>====================== */ 

//Создание нового пользователя в localStorage
const createNewUser = () => {
  let userLocalData = {    //пользовательские переменные теста
    name: '',
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
          console.log("havesomeone");
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
    totalTimer = 0
    controllButton.innerText = "Еще раз"
    if (await getLocalStorage('finishedData').length !== 0) {
      timerShow.style.minWidth = '400px'
      timerShow.innerHTML = `<span>Вы правильно ответили на ${getLocalStorage('finishedData')[0]} из ${getLocalStorage('finishedData')[1]} вопросов!</span>`;
    }
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

//сравнение массивов 
const arrayCompare = (a, b) => {
    // если длины разные - не соответствуют
    a = a.sort()
    b = b.sort()
    if(a.length != b.length)
      return false;

    for(let i = 0; i < a.length; i++)
      if(a[i] != b[i])
          return false;
    return true;
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
  // if (getLocalStorage('userData').length === 0) {
  //   setLocalStorage('userData', [])
  //   console.log("qwe");
  // }
  let userAnswers = getLocalStorage('userData') ;
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
  
  if (getLocalStorage('finishedData').length === 0) {
    let totalCurrentScore = [0, 0];
    let corrItemCurrent;
    let userItemCurrent;

    correctData.forEach( corrItem => {
      corrItemCurrent = corrItem.answerText;
      userItemCurrent = userAnswers.filter(userItem =>userItem.qID === corrItem.qID )[0].userAnswers
      if (corrItemCurrent == userItemCurrent) {

      }
      if (arrayCompare(corrItemCurrent, userItemCurrent)) {
        totalCurrentScore[0] +=1
        totalCurrentScore[1] +=1
      } else {
        totalCurrentScore[1] +=1
      }
    })

    setLocalStorage('finishedData', totalCurrentScore)

  }
  return {'userAnswers': userAnswers, 'correctData': correctData}
}

//Функция проверки ответа проверяет 2 массива на соответсвие друг другу
const checkAnwser = (correct, user) => {
  const tickMark = document.querySelector('.question-header__tick')
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
      tickMark.style.opacity = '1';
      tickMark.style.backgroundColor = 'green'
    } else if (result.length > 0) {
      // console.log('Есть над чем еще поработать!!!!'); //Вывод в консоль сравнения результатов
      result.forEach(i => {
        document.querySelector(`[data-answer-index="${i}"]`).classList.add('question-body__item-wrong')
        tickMark.style.opacity = '1';
        tickMark.style.backgroundColor = 'red'
      })
    }

  } else {
    // console.log("Длина разная"); //Вывод в консоль сравнения результатов
    // console.log("Далее сравниваем по соответствию..."); //Вывод в консоль сравнения результатов
    let result = user.filter(i => !correct.includes(i))
    result.forEach(i => {
      document.querySelector(`[data-answer-index="${i}"]`).classList.add('question-body__item-wrong')
      tickMark.style.opacity = '1';
      tickMark.style.backgroundColor = 'red'
    })
    // console.log('Есть над чем еще поработать!'); //Вывод в консоль сравнения результатов
  }
}

const testTimer = () => {
  let seconds = totalTimer%60 // Получаем секунды
  let minutes = totalTimer/60%60 // Получаем минуты
  let hour = totalTimer/60/60%60 // Получаем часы
  // Условие если время закончилось то...
  if (totalTimer <= 0) {
      // Таймер удаляется
      stopTesting()
  } else { // Иначе
      // Создаём строку с выводом времени
      if (totalTimer > 60) {
        timerShow.style.color = 'black'
        timerShow.style.fontWeight = 'regular'
      } else {
        timerShow.style.color = 'red'
        timerShow.style.fontWeight = 'bold'
      }

      let strTimer = `${Math.trunc(minutes) < 10 ? '0' + Math.trunc(minutes) : Math.trunc(minutes)}:${seconds < 10 ? '0' + seconds : seconds}`;
      // Выводим строку в блок для показа таймера
      timerShow.innerHTML = `<span>${strTimer}</span>`;
      timerShow.style.minWidth = '50px'
  }
  --totalTimer; // Уменьшаем таймер
}

const startTesting = async () => {
  controllButton.closest(".controll-block").classList.remove('controll-block--zoomed'); //убираем кнопку в угол
  mainSection.style.display = 'block';

  if(finished){
    localStorage.removeItem('userData')
    finished = false;
    await pushDataOfDBToStorage();
    currentQuestionIndex = 0;
  }

  setLocalStorage('timerSet', new Date().getTime() + 600000) //ставим временную метку
  totalTimer = await Math.round((getLocalStorage('timerSet') - new Date().getTime())/1000); //Секунды таймера
  timer = setInterval(testTimer, 1000)
  storageData = getLocalStorage('allQuestion')
  reRenderCurrentQuestion(currentQuestionIndex)  
  controllButton.innerText = "Завершить"
  testSettings.testedNow = true
  await setLocalStorage('userLocalData', testSettings)
  localStorage.removeItem('finishedData')
}

const stopTesting = async () => {
  clearInterval(timer);
  await localStorage.removeItem('timerSet')
  // timerShow.innerHTML = '';
  mainSection.style.display = 'block';
  controllButton.innerText = "Еще раз";
  testSettings.testedNow = false
  await setLocalStorage('userLocalData', testSettings)
  finished = true;
  await reRenderCurrentQuestion(currentQuestionIndex)
  if (getLocalStorage('finishedData').length !== 0) {
    timerShow.style.color = 'black'
    timerShow.style.fontWeight = 'regular'
    timerShow.style.minWidth = '400px'
    timerShow.innerHTML = `<span>Вы правильно ответили на ${getLocalStorage('finishedData')[0]} из ${getLocalStorage('finishedData')[1]} вопросов!</span>`;
  }
}

const initialize = async () => { //Иницализация 
  testSettings =  getLocalStorage('userLocalData') //записывым в переменную данные из карточки
  userName.innerText = testSettings.name //Устанавливаем актуальное имя из карточки
        
  if (await getLocalStorage('allQuestion').length === 0) {
    await pushDataOfDBToStorage();
    questionLenght = getLocalStorage('allQuestion').length;
    storageData = getLocalStorage('allQuestion');
  } else {
    questionLenght = getLocalStorage('allQuestion').length;
    storageData = getLocalStorage('allQuestion');   
    reRenderCurrentQuestion(currentQuestionIndex) 
    
    if(finished) {
      controllButton.closest(".controll-block").classList.remove('controll-block--zoomed'); //убираем кнопку в угол
      mainSection.style.display = 'block';
    }
  
  }

  if(!testSettings.testedNow) {
    controllButton.innerText = "Начать"
  } else {
    controllButton.innerText = "Завершить"
  }  
  
  //слушаем клик по кнопке старт/стоп
  controllButton.addEventListener('click', async () => {
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
/* ======================<Блок с функциями (END)>====================== */ 




/* ======================<Блок с логикой> (BEGIN) ============================= */
if(localStorage.length > 0) {
  localStorage.clear()
}


//Для начала проверяем есть ли в localStorage 
if (getLocalStorage('userLocalData').length === 0) { //Если нет - то создаем. Если юзера еще небыло - то и вопросов быть не может, поэтому чистим localStorage 
  localStorage.clear()
  createNewUser() //Создаем карточку пользователя
  initialize()
}
else {   //в противном случае получаем данные для последующего рендера
  initialize()
}


// if (getLocalStorage('testSettings')) {
//   testSettings = getLocalStorage('testSettings')
// }

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
submitBtn.addEventListener('click',async () => {  
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
        await appendToStorage('userData', currentQuestionUserData);
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


function toggleFullScreen() {
  var doc = window.document;
  var docEl = doc.documentElement;

  var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

  if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
    requestFullScreen.call(docEl);
  }
  else {
    cancelFullScreen.call(doc);
  }
}
toggleFullScreen()
