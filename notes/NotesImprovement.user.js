// ==UserScript==
// @name         Notes Improvement
// @namespace    https://toptal.com
// @version      0.1
// @description  This script improves handling of the candidate notes
// @author       Secret Monkey
// @match        https://www.toptal.com/platform/staff/talents/*
// @icon         https://www.google.com/s2/favicons?domain=undefined.
// @grant        none
// ==/UserScript==


// This is experimental. Very experimental. If it breaks you need to disable or fix it by yourself. Godspeed.
// It's 75% legal. Don't brag you have it. Keep in under the radar. 👀

// This function generates nice buttons
const generateRadioButton = (title, name, labels_values) => {
    let element = document.createElement('div');

    let buttons = labels_values.map(pair => (
        `<label class="radio">
              <input data-notes-enhanced-input="true" class="radio_buttons" data-notes-enhanced-label="${name}" data-notes-enhanced-value="${pair[1]}" type="radio" value="${pair[1]}" name="${name}"/>
              <span class="radio_label_wrap">${pair[0]}</span>
            </label>`
    )).join('\n');
    element.innerHTML = `
     <div class="note-question narrow">
      <div class="column is-label is-40">
        <div class="note-question_label">
          <span>${title}</span>
        </div>
      </div>
      <div class="column is-answer is-60">
          <div class="ui-radio is-middle is-note_inline is-note_survey_answers form-field js-field_wrapper radio_buttons required note_talent_add_technical_one_call_note_answers_option_id">
            ${buttons}
          </div>
      </div>
    </div>
    `;
    return element;
}

// This function generates (disabled) text inputs - for info and such
const generateTextInput = (title, name) => {
    let element = document.createElement('div');

    element.innerHTML = `
     <div class="note-question narrow">
      <div class="column is-label is-40">
        <div class="note-question_label">
          <span>${title}</span>
        </div>
      </div>
      <div class="column is-answer is-60">
          <div class="ui-textbox is-middle is-note_inline form-field js-field_wrapper string required note_talent_add_technical_one_call_note_answers_value">
            <input id="${name}" type="text" class="string input" disabled="disabled"/>
          </div>
      </div>
    </div>
    `;
    return element;
}

// This is separator, however I don't like it and I didn't use it. Maybe I'll do something with it.
const generateSeparator = (title) => {
    let element = document.createElement('div');
    element.innerHTML = `
     <div class="note-question narrow">
      <div class="column is-label is-70">
        <div class="note-question_label">
          <>${title}</span>
        </div>
      </div>
    </div>
    `;
    return element;
}

// Generates nice header - blueviolet so that "enhanced" fields would be visible
const generateHeader = (title) => {
    let element = document.createElement('div');
    element.innerHTML = `
    <div class="panel-subheader for-notes" style="color: blueviolet;">
      ${title}<sup>*</sup>
    </div>
    `;
    return element;
}

// Helper function to chain multiple elements into DOM
const chainElements = (start, elements) => {
    let currentElement = start;
    elements.forEach(el => {
        currentElement.insertAdjacentElement('afterend', el);
        currentElement = el;
    });
}


// Gets the value for the "enhanced label"
const getValue = (title) => {
    const elements = $(`[data-notes-enhanced-label="${title}"]:checked`);
    if(elements.length === 0)
        return '';

    return elements[0].getAttribute('data-notes-enhanced-value');
}

// Calculate task score
// Has a gatekeep so that it doesn't do anything unless task-related attributes had changed
const calculateTask = (target) => {
    let targets = ['t1_gp', 't1_complete', 't1_speedy', 't2_gp', 't2_complete', 't2_speedy', 'ot_great_score'];

    if(!targets.includes(target.getAttribute('data-notes-enhanced-label'))) {
        return false;
    }
    const guidance_element = $('#t1_guidance');
    const final_guidance_element = $('#t_guidance');

    let task_score = 0;
    let t1_score = 0;
    let t2_score = 0;

    if(getValue('t1_gp') === '1')
        t1_score += 1.5;

    if(getValue('t1_complete') === '100')
        t1_score += 3.5;

    if(getValue('t1_complete') === 'almost')
        t1_score += 1.5;

    task_score = t1_score;

    // Guidance after T1
    if(t1_score < 2.5)
        guidance_element.val('FAIL');
    else if(t1_score < 3.5)
        guidance_element.val('Proceed - Adaptive');
    else
        guidance_element.val('Proceed.');

    if(getValue('t2_gp') === '1')
        t2_score += 1.5;

    if(getValue('t2_complete') === '100')
        t2_score += 3.5;

    if(getValue('t2_complete') === 'almost')
        t2_score += 1.5;

    task_score += t2_score;
    if(getValue('t1_speedy') === '1')
        task_score += 0.5;

    if(getValue('t2_speedy') === '1')
        task_score += 0.5;

    if(getValue('ot_great_score') === '1')
        task_score += 1;

    if(task_score > 5.5) {
        task_score = Math.round(task_score/2);
    } else {
        task_score = Math.floor(task_score/2);
    }

    // Constraining to 1-5
    task_score = Math.min(5, Math.max(1, task_score));
    $('#t_score').val(task_score);

    if(task_score < 3)
        final_guidance_element.val('FAIL');
    else if (task_score < 5){
        const adaptiveMsg = t1_score < 3.5 || t2_score < 3.5 ? '➕Add "T1 - Flexible Passing Threshold" flag' : "";
        final_guidance_element.val(`1- or 2- week assignement. ${adaptiveMsg}`);
    }
    else
        final_guidance_element.val('Consider expedite Core T2');

    $(`[data-notes-enhanced-label="Task Execution"][data-notes-enhanced-value="${task_score}"]`).prop("checked", true);
    $(`[data-notes-enhanced-label="Task Execution"][data-notes-enhanced-value="${task_score}"]`).click();

    return true;
}
const calculate = (e) => {

    // Calculating task part
    if(calculateTask(e.target))
        return;

    // Calculates final grade
    const weights = {
        'Task Execution': 10,
        'Domain / technical experience': 4,
        'Communication': 1,
        'Teamwork and Leadership': 1,
        'Creativity and problem solving': 2,
        'Professionalism and integrity': 2
    };

    let final_score = 0;
    for(let grade of Object.keys(weights)) {

        let value = getValue(grade);
        if(value === '')
            value = '0';

        final_score += parseInt(getValue(grade))*weights[grade];
    }

    $('div.note-question_label:contains("Calculated Grade")').last().parent().next().find('input').val(final_score/Object.values(weights).reduce((acc,i) => acc+i));




    //$('#t_score').val(e.target.getAttribute('data-notes-enhanced-label'));
}

function hookNotes() {
    // Create hook element so we don't double hook
    let hookElement = document.createElement('div');
    hookElement.id = 'special-enhancements';

    // Don't double hook
    if($('#special-enhancements').length === 1)
        return;

    // This is where we hook
    let verticalExpertiseElement = $("div:contains('Vertical Expertise')").last();
    if(verticalExpertiseElement.length === 0)
        return;

    verticalExpertiseElement[0].insertAdjacentElement('beforebegin', hookElement);

    // Build UI using helpers
    chainElements(hookElement, [
          generateHeader('Task 1 Performance'),
          generateRadioButton('Task Completed?', 't1_complete', [['No', 'no'], ['Completed 100%', '100'], ['Almost / 70% Test Cases', 'almost']]),
          generateRadioButton('Developed using good practices?', 't1_gp', [['No', '0'], ['Yes', '1']]),
          generateRadioButton('Speedy performance (<80% time for task)', 't1_speedy', [['No', '0'], ['Yes', '1']]),
          generateTextInput('Guidance', 't1_guidance'),
          generateHeader('Task 2 Performance'),
          generateRadioButton('Task Completed?', 't2_complete', [['No', 'no'], ['Completed 100%', '100'], ['Almost / 70% Test Cases']]),
          generateRadioButton('Developed using good practices?', 't2_gp', [['No', '0'], ['Yes', '1']]),
          generateRadioButton('Speedy performance (<80% time for task)', 't2_speedy', [['No', '0'], ['Yes', '1']]),
          generateHeader('Task Summary'),
          generateRadioButton('OT Score > 85% ?', 'ot_great_score', [['No', '0'], ['Yes', '1']]),
          generateTextInput('Calculated Task Score', 't_score'),
          generateTextInput('Performance Advice', 't_guidance'),

        ]);

    // Labeling the radio inputs with something sensible
    // i.e. instead of original we get data-notes-enhanced-label & data-notes-enhanced-value
    $('.is-answer input[type="radio"]').toArray().forEach(el => {

        if(!el.parentElement || el.hasAttribute('data-notes-enhanced-label')) {
            return;
        }
        // https://www.youtube.com/watch?v=fzSJ63TY0Ic?t=32
        el.setAttribute('data-notes-enhanced-label', el.parentElement.parentElement.parentElement.previousSibling.innerText);
        el.setAttribute('data-notes-enhanced-value', el.nextSibling.innerText);
    });

    // Hooking up categories for iteraction/calculation - categories
    $('[data-notes-enhanced-label="Task Execution"]').on('click', calculate);
    $('[data-notes-enhanced-label="Domain / technical experience"]').on('click', calculate);
    $('[data-notes-enhanced-label="Communication"]').on('click', calculate);
    $('[data-notes-enhanced-label="Teamwork and Leadership"]').on('click', calculate);
    $('[data-notes-enhanced-label="Creativity and problem solving"]').on('click', calculate);
    $('[data-notes-enhanced-label="Professionalism and integrity"]').on('click', calculate);

    // And the one we created
    $('[data-notes-enhanced-input="true"]').on('click', calculate);
}
(function() {
    'use strict';

    // "Normal" hook
    hookNotes();
    // Hook for edit
    $('.note-title a:contains("Technical One")').parent().nextAll('.note-icons').find('a.js-item-edit').on('click', () => setTimeout(hookNotes, 2000));
})();
