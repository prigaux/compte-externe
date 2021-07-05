<template>
  <my-bootstrap-form-group name="day" :opts="opts">
   <div class="row">
    <div class="col-xs-2" :class="{'my-has-error': !validity.day.valid }">
        <div>
        <input-with-validity name="day" v-model="day" type="number" min="1" :max="maxDay" placeholder="Jour" :required="!opts.optional" :validity.sync="validity.day"></input-with-validity>
        <validation-errors name="day" :validity="validity"></validation-errors>
        </div>
    </div>
    <div class="col-xs-2" :class="{'my-has-error': !validity.month.valid }">
        <div>
        <input-with-validity name="month" v-model="month" type="number" min="1" max="12" placeholder="Mois" :required="!opts.optional" :validity.sync="validity.month"></input-with-validity>
        <validation-errors name="month" :validity="validity"></validation-errors>
        </div>
    </div>
    <div class="col-xs-5" :class="{'my-has-error': !validity.year.valid }">
        <div>
        <input-with-validity name="year" v-model="year" type="number" :min="opts.minYear" :max="opts.maxYear" placeholder="Année" :required="!opts.optional" :validity.sync="validity.year"></input-with-validity>
        <validation-errors name="year" :validity="validity"></validation-errors>
        </div>
    </div>
   </div>
  </my-bootstrap-form-group>
</template>

<script lang="ts">
import Vue from "vue";
import * as Helpers from '../services/helpers';

function init(date) {
    return {
        year: date && date.getUTCFullYear() || '',
        month: date && (date.getUTCMonth() + 1) || '',
        day: date && date.getUTCDate() || '',
    };
}

const month2maxDay = [undefined,
        31, 29, 31, 30, 31, 30,
        31, // july
        31, 30, 31, 30, 31];


export default Vue.extend({
    props: ['value', 'opts'],
    data() {
        return {
            validity: { year: {}, month: {}, day: {} },
            ...init(this.value),
        };
    },
    watch: {
        value(val) {
            if (val && val !== this.currentValue) Helpers.assign(this, init(val));
        },
        currentValue(val) {
            if (+val !== +this.value) {
                this.$emit('input', val);
            }
        },
    },
    computed: {
        maxDay() {
            return this.month && month2maxDay[this.month] || 31;
        },
        currentValue() {
            const [ year, month, day, minYear, maxYear, maxDay ] = [ 'year', 'month', 'day', 'minYear', 'maxYear', 'maxDay' ].map(n => parseInt(this[n]));
            return year && month && day && 
                   day <= maxDay &&
                   (!minYear || minYear <= year) && 
                   (!maxYear || year <= maxYear) &&
               new Date(Date.UTC(year, month - 1, day)) || undefined;
        },
    },
});
</script>
