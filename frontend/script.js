'use strict';

/**
 * collects input data from input field for prediction
 */
class Predictor {
  clicks = 0;

  constructor(coords, date) {
    this.coords = coords; //[lat, lng] for clicked element on card
    this.date = date; //select date for prediction
  }

  _setDescription() {

    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    //description for Prediction
    this.description = `${this.getLocationByCoord()}`;
  }

  /**
   * not ready yet for api call
  async getLocationByCoord(){
    const data = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${this.coords[0]}&lon=${this.coords[0]}`);
    return data;
  }
  */

  //for testing
  getLocationByCoord(){
    return "Klinikum Großhadern";
  }

  click() {
    this.clicks++;
  }
}

/**
 * collects input data from input field for prediction for MRI Scans
 */
class MRI extends Predictor {
  type = 'MRI';

  constructor(coords, date) {
    super(coords, date);
    this.service = 'MRI';
    this.predictMRI();
    this._setDescription();
  }

  //prediction algorithm with given parameters
  predictMRI() {
    // todo -> connect with trained model
    this.prediction = Math.floor(Math.random() *  10);
    return this.prediction;
  }
}

/**
 * collects input data from input field for prediction for other potential Siemens Healthineers Services
 */
class Other extends Predictor {
  type = 'Other';

  constructor(coords, date) {
    super(coords, date);
    this.service = 'Other';
    this.predictOther();
    this._setDescription();
  }

  //prediction algorithm with given parameters
  predictOther() {
    // todo -> connect with trained model
    this.prediction = Math.floor(Math.random() *  10);
    return this.prediction;
  }
}

///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerPredictions = document.querySelector('.Prediction');
const inputService = document.querySelector('.form__input--Service');
const inputDate = document.querySelector('.form__input--Date');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #predictions = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newPrediction.bind(this));
    inputService.addEventListener('change', this._toggleElevationField);
    containerPredictions.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#predictions.forEach(work => {
      this._renderPredictionMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDate.focus();
  }

  _hideForm() {
    // Empty inputs
    inputService.value = inputDate.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputPrediction.closest('.form__row').classList.toggle('form__row--hidden');
    inputLocation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newPrediction(e) {
    const validInputs = (...inputs) => true;
    //inputs.every(inp => Number.isFinite(inp));

    e.preventDefault();

    // Get data from form
    const service = inputService.value;
    const date = inputDate.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let prediction;

    // If prediction mri, create mri object
    if (service === 'MRI') {

      // Check if data is valid
      if (!validInputs(date))
        return alert('Input has to be valid date!');

      prediction = new MRI([lat, lng], date);
    }

    // If prediction Other, create Other object
    if (service === 'Other') {

      if (!validInputs(date))
        return alert('Input has to be valid date!');

      prediction = new Other([lat, lng], date);
    }

    // Add new object to prediction array
    this.#predictions.push(prediction);

    // Render prediction on map as marker
    this._renderPredictionMarker(prediction);

    // Render prediction on list
    this._renderPrediction(prediction);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderPredictionMarker(prediction) {
    L.marker(prediction.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${prediction.type}-popup`,
        })
      )
      .setPopupContent(
        `${prediction.type === 'MRI' ? '📅' : '🌐'} ${prediction.description}:
        ${prediction.date}`
      )
      .openPopup();
  }

  _renderPrediction(prediction) {
    let html = `
      <li class="prediction--${prediction.type}" data-id="${prediction.id}">
        <h2 class="prediction__title">Prediction</h2>
        <div class="prediction__details">
          <span class="prediction__unit">Location</span>
          <span class="prediction__value">${prediction.description}</span>
        </div>
        <div class="prediction__details">
          <span class="prediction__unit">Date</span>
          <span class="prediction__value">${prediction.date}</span>
        </div>
    `;

    if (prediction.type === 'MRI')
      html += `
        <div class="prediction__details">
          <span class="prediction__unit">MRI Scans</span>
          <span class="prediction__value">${prediction.prediction}</span>
        </div>
      </li>
      `;

    if (prediction.type === 'Other')
      html += `
        <div class="prediction__details">
          <span class="prediction__unit">Other Predictions</span>
          <span class="prediction__value">${prediction.prediction}</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    // BUGFIX: When we click on a prediction before the map has loaded, we get an error. But there is an easy fix:
    if (!this.#map) return;

    const predictionEL = e.target.closest('.prediciton');

    if (!predictionEL) return;

    const prediction = this.#predictions.find(
      work => work.id === predictionEL.dataset.id
    );

    this.#map.setView(prediction.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    //removed for demonstration purpose in pitch
    //localStorage.setItem('predictions', JSON.stringify(this.#predictions));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('predictions'));

    if (!data) return;

    this.#predictions = data;

    this.#predictions.forEach(work => {
      this._renderPrediction(work);
    });
  }

  //for delet button
  reset() {
    localStorage.removeItem('prediction');
    location.reload();
  }
}

const app = new App();
