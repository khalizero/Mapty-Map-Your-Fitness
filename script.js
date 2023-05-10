'use strict';

///////////////
// DOM ELEMENTS
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//////////////////////////////////////////////////
// MAKING A CLASS NAMED APP (PROGRAM ARCHITECTURE)
class App {
  #map;
  #Eventcoords;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    this._getPosition();
    form.addEventListener(`submit`, this._newWorkout.bind(this));
    inputType.addEventListener(`change`, this._toggleElevationField);
    containerWorkouts.addEventListener(`click`, this._moveToPopup.bind(this));
    // GETTING DATA ARRAY IN THE LOCAL STORAGE
    this._getLocalStorage();
  }

  // This method gets the position
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`ERROR : Location could not be retrieved.`);
        }
      );
    }
  }

  // This method gets the map for the getposition method
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    // Using a map from leaflet library
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on(`click`, this._showForm.bind(this));

    this.#workouts.forEach(work => this._renderMarker(work));
  }

  // _showForm Method starts here
  _showForm(Ecoords) {
    this.#Eventcoords = Ecoords;
    form.classList.remove(`hidden`);
    inputDistance.focus();
  }

  _hideForm() {
    // clearing the input fields
    // prettier-ignore
    inputDistance.value =inputDuration.value =inputElevation.value =inputCadence.value =``;

    // hiding the form on enter
    form.style.display = `none`;
    form.classList.add(`hidden`);
    setTimeout(() => {
      form.style.display = `grid`;
    }, 1000);
  }
  // _toggleElevationField Stars here
  _toggleElevationField() {
    inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
    inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);
  }

  // _newWorkout Method Starts here
  _newWorkout(e) {
    e.preventDefault();

    // Making some helper functions for form validation
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPostive = (...inputs) => inputs.every(inp => inp > 0);

    // Get the form data
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    // Getting the coordinates
    const { lat, lng } = this.#Eventcoords.latlng;
    let workout;
    // if workout running, create running object
    if (type === `running`) {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPostive(distance, duration, cadence)
      )
        return alert(`Input must be a positive value`);

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //  if workout cycling, create cycling object
    if (type === `cycling`) {
      const elevation = +inputElevation.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPostive(distance, duration)
      )
        return alert(`Input must be a positive value`);

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout Array
    this.#workouts.push(workout);

    // Render workout on map as a marker
    this._renderMarker(workout);

    // RENDER WORKOUT IN THE LIST
    this._renderWorkout(workout);

    // Hiding the form
    this._hideForm();

    // SETTING #WORKOUTS ARRAY IN THE LOCAL STORAGE
    this._setLocalStorage();
  }

  // Made a marker render method
  _renderMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 300,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === `running` ? `🏃‍♀️` : `🚴‍♂️`} ${workout.description}`
      )
      .openPopup();
  }

  // Made a render method to list
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === `running` ? `🏃‍♀️` : `🚴‍♂️`
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
     `;
    if (workout.type === `running`) {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    }
    if (workout.type === `cycling`) {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    }
    form.insertAdjacentHTML(`afterend`, html);
  }

  // moving to the marker that the data is related to
  _moveToPopup(e) {
    const workoutEl = e.target.closest(`.workout`);
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // workout.click();
  }

  // Setting data in local storage method
  _setLocalStorage() {
    localStorage.setItem(`workouts`, JSON.stringify(this.#workouts));
  }

  // Getting data from local storage method
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem(`workouts`));
    console.log(data);
    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  // removing all date - RESETTING
  reset() {
    localStorage.removeItem(`workouts`);
    location.reload();
  }
}

////////////////////////////////
//  MAKING A CLASS NAMED WORKOUT
class Workout {
  date = new Date();
  id = (Date.now() + ``).slice(-10);
  // clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat , lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = [`January` , `February` , `March` , `April` , `May` , `June` , `July` , `August` , `September` , `October` , `November` , `December`]
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  // click() {
  //   this.clicks++;
  // }
}

//////////////////////////////////////////////////////
// MAKING A Child CLASS Running Of Class NAMED WORKOUT
class Running extends Workout {
  type = `running`;
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

//////////////////////////////////////////////////////
// MAKING A Child CLASS CYCLING Of Class NAMED WORKOUT
class Cycling extends Workout {
  type = `cycling`;
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();

    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const app = new App();
