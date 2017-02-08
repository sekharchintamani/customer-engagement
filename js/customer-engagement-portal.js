/**
 * CUSTOMER-ENGAGEMENT-PORTAL.JS
 * Controls behavior of portal UI elements
 */
;(function ($, window, document, undefined) {
  // Postpone execution until DOM is loaded
  $(function() {
    /**
     * Setup several app-wide collections:
     * 1. dict:
     *      Dictionaries used for human-readable strings.
     * 2. config:
     *      Configuration objects used throughout the app.
     * 3. dom:
     *      Cached jQuery object hooks to important DOM elements
     * 4. state:
     *      Application state
     * 5. util:
     *      Misc utility methods, unrelated to app execution logic
     */
    var
      dict = {
        'loantype_labels': {
          'new-purchase': 'Home Purchase',
          'refinance':    'Refinance',
          'cashout':      'Take Out Cash',
        },
        'field_summary_labels': {
          'zipcode':            'Zip Code',
          'residencetype':      'Property Type',
          'propertyuse':        'Property Use',
          'creditscore':        'Credit Score',
          'purchaseprice':      'Purchase Price',
          'downpaymentpercent': 'Down Payment',
          'estval':             'Est. Home Value',
          'curmortgagebalance': 'Mortgage Balance',
          'fha':                'FHA Loan',
          'cashout':            'Cash Out'
        },

        'tooltips': {
        /* eslint-disable max-len */
         'rate':      'The interest rate is the yearly rate charged by lender to a borrower in order for the borrower to obtain a loan. This is expressed as a percentage of the total amount loaned. Note that rates may increase for adjustable rate mortgages.',
         'apr':       'Annual percentage rate (APR) is the cost of credit expressed as a yearly rate. The APR includes the interest rate, points, lender fees, and certain other financing charges the borrower is required to pay.',
         'closing':   'Click on the Details button for detailed split of the total estimated closing closts.',
         'monthlies': 'This is the estimated monthly mortgage payment for principal and interest only. This does not include property taxes, homeowner’s insurance, or mortgage insurance (if applicable), which could increase your monthly payment.'
         /* eslint-enable max-len */
         }
       },

      config = {
        'loantypes': {
          'new-purchase': {
            'fields': [
              'zipcode',
              'residencetype',
              'propertyuse',
              'creditscore',
              'purchaseprice',
              'downpaymentpercent'
            ]
          },
          'refinance': {
            'fields': [
              'zipcode',
              'residencetype',
              'propertyuse',
              'creditscore',
              'estval',
              'curmortgagebalance',
              'fha'
            ]
          },
          'cashout': {
            'fields': [
              'zipcode',
              'residencetype',
              'propertyuse',
              'creditscore',
              'estval',
              'curmortgagebalance',
              'cashout'
            ]
          }
        },

        'program_product_sort': {
          'CONFORMING':     100,
          'NONCONFORMING':  200,
          'FHA':            300,
          'FHA-Streamline': 400
        },

        'program_name_sort': {
          '30 year Fixed': 10,
          '15 year Fixed': 20,
          '20 year Fixed': 30,
          '10 year Fixed': 40,
          '7 year ARM':    50,
          '5 year ARM':    60
        },

        // Dynamic html templates
        'templates': {
          'details_summary':        Handlebars.compile($('#details_summary_template').html()),
          'rate_loading_animation': Handlebars.compile($('#rate_loading_animation_template').html()),
          'rates_listing':          Handlebars.compile($('#rates_listing_template').html()),
          'rates_detail':           Handlebars.compile($('#rates_detail_template').html()),
          'chosen_rate_summary':    Handlebars.compile($('#chosen_rate_summary_template').html()),
          'tooltip':                Handlebars.compile($('#tooltip_template').html())
        }
      },

      dom = {
        // jQuery object hooks
        $loan_form:                                 $('[data-js=loan-form]'),
        $loantype_radioset:                         $('[data-js=loantype-radioset]'),
        $loan_form__collect_details_stage:          $('[data-js=loan-form__collect-details-stage]'),
        $loan_summary:                              $('[data-js=loan-form__details-summary-stage]'),
        $loan_form__details_summary_injectionpoint: $('[data-js=loan-form__details-summary-injectionpoint]'),
        $ratetype_radioset:                         $('[data-js=ratetype-radioset]'),
        $ratetype_form__wrapper:                    $('[data-js=rates-listing__wrapper]'),
        $ratetype_form:                             $('[data-js=ratetype-form]'),
        $rates_listing__wrapper:                    $('[data-js=rates-listing__injectionpoint]'),
        $user_registration__wrapper:                $('[data-js=user-registration-wrapper]'),
        $user_registration_form:                    $('[data-js=user-registration-form]'),
        $rate_list_error:                           $('[data-js=rate-list-error]'),
        $user_query_form:                           $('[data-js=user-query-form]')
      },

      // Application state
      state = {
        'loan_advisors': null,
        'data_cache':    {
          'rates':        {
            'request':     null,
            'response':    null,
            'cleaned':     null
          }
        },
        'chosen_loan_type': null,
        'chosen_program':   null,
        'chosen_rate':      null
      },

      util = {
        // Remove formatting from nubers formatted for display as currency amounts
        currencyToFloat: function currencyToFloat(value) {
          return 1 * accounting.unformat(value);
        }
      },
      lasearch = false,
      loanAdvisorList =[],
      loanAdvisorMap =[],
      userRegistrationValidator = null
      ;

    /**
     * function init()
     *
     * App initialization
     *
     * 1. Apply custom jQuery plugin behaviors to form elements
     * 2. Add custom validators for the jQuery.validate plugin
     * 3. Setup handlers and validation for forms
     * 4. Add handlers for dynamically generated interactive elements
     *
     * @return none
     */
    function init() {
      /**
       *  1. Apply custom jQuery plugin behaviors to form elements
       */

      // Auto-format currency fields
      $('input[data-format-as-currency]').currencyInput();

      // Initialize linked slider for purchase price»down payment fields
      $('#downpaymentpercent').linkedPercentSlider();

      // Hide UI elements not in-use at outset
      dom.$loan_form__collect_details_stage.hide();
      $('[data-js^=details--]', dom.$loan_form__collect_details_stage).hide();
      dom.$ratetype_form__wrapper.hide();
      toggleAdvisorInput();

      /*
       * 2. Add custom validators for the jQuery.validate plugin
       */
      addCustomFormFieldValidators();

      getNewfiAdvisors();

      /*
       * 3. Setup handlers and validation for forms
       */
      dom.$ratetype_form
        // Handle selection of rate types
        .on( 'change', 'input[name=ratetype]', switchRateTypes)
        // Handle submission of rates form
        .on( 'submit', function(ev){
          ev.preventDefault ? ev.preventDefault() : (ev.returnValue = false); // IE
          ev.cancelBubble = true; // IE
          switchRateTypes();
          return false; // IE
        })
        ;

      dom.$user_query_form.
      on('submit', function(ev){
        ev.preventDefault ? ev.preventDefault() : (ev.returnValue = false);

        userqueryFormValidation();
        if($(this).valid()) {
          submitUserQuery($(this));
        }
      })

      dom.$user_registration_form
        // Handle selection of loan types
        .on( 'change, click', 'input[name=newfiadvisor]', toggleAdvisorInput)
        // Handle submission of details form
        .on( 'submit', function(ev){
          ev.preventDefault ? ev.preventDefault() : (ev.returnValue = false); // IE
          // ev.cancelBubble = true; // IE

          userRegistrationFormValidation();

          if ($(this).valid()) {
            submitUserRegistration(this);
          }
          // return false; // IE
        })
        ;

      dom.$loan_form
        // Handle selection of loan types
        .on( 'change', 'input[name=loantype]', switchLoanTypes)
        // Handle submission of details form
        .on( 'submit', function(ev){
          ev.preventDefault ? ev.preventDefault() : (ev.returnValue = false); // IE
          if ($(this).valid()) {
            $('#basic-information').fadeOut(300);
            dom.$rate_list_error.fadeOut(300);
            submitLoanDetailsForm();
          }
        })
        // Configure validation
        .validate({
          onkeyup: false,
          messages: {
            zipcode: {
              remote:  jQuery.validator.format("Please enter a valid Zip Code in a Newfi approved state: AZ, CA, CO, OR or WA")
            }
          },
          rules: {
            loantype: 'required',
            zipcode:  {
              required: true,
              zipCodeValidation: true,
              'remote':   {
                url:        'http://52.74.75.203:8080/NewfiWeb/rest/states/zipCode',
                type:       'GET',
                datatype:   'text',
                data:       {zipCode: function(){return $('#zipcode').val();}},
                dataFilter: function(data, type){
                  return /Valid ZipCode/.test(data) ? 'true' : 'false';
                }

              }
            },
            residencetype: 'required',
            propertyuse:   'required',
            creditscore:   'required',
            purchaseprice: {
              required_for_purchase: true,
              currencyNumber:        true
            },
            downpaymentpercent: {
              required_for_purchase: true,
              range:                 [3, 99]
            },
            estval: {
              required_for_cashout: true,
              required_for_refi:    true,
              currencyNumber:       true
            },
            curmortgagebalance: {
              required_for_cashout: true,
              required_for_refi:    true,
              currencyNumber:       true
            },
            fha: {
              required_for_refi:    true
            },
            cashout: {
              required_for_cashout: true,
              currencyNumber:       true
            }
          }
        })
        ;

      /*
       * 4. Add handlers for dynamically generated interactive elements
       */
      $('body')
        .on( 'click', '[data-js=show-details-form]', regressToLoanDetails)
        .on( 'click', '[data-js=show-rate-details]', function(){showRateDetails(this);})
        .on( 'click', '[data-js=close-rate-details]', showRatesTable)
        .on( 'click', '[data-js=show-rate-table]', regressToRateTable)
        .on( 'click', '[data-js=select-rate]', function(){selectRate(this);})
        .on( 'click', '[data-js=trigger-tooltip]', function(event){toggleTooltips(event, this);})
        ;
    }

    /**
     * Update UI state and manage DOM transitions when the loan type
     * has been changed.
     */
    function switchLoanTypes() {
      // record state for later use
      state.chosen_loan_type = $('input[name=loantype]:checked', dom.$loantype_radioset).val();
      toggleFieldsInLoanDetailsForm(state.chosen_loan_type);

      // Clear any error states from validation
      // dom.$loan_form.validate().resetForm();
      $('.c-form-element.c-has-error', dom.$loan_form).removeClass('c-has-error');
      $('label.c-form-element__help', dom.$loan_form).remove();

      // The first time we display the details container
      removeLoantypeIcons();
      showLoanDetailsForm();
    }

    /**
    * Helper to add/remove any tooltips from the DOM
    * @param  {element} event The event that trigggered this call
    */
   function toggleTooltips(event, el) {
     // TODO: Show/hide tooltips. pseudo-code:
     //
     // if (showing a tooltip) {
     //   renderTooltip(el)
     // } else if (clicking on an existing tooltip){
     //   return; // do nothing
     // } else {
     //   remove tooltips
     // }

     $('.c-tooltip').remove();

     var tooltip = renderTooltip(el);

     $(el).append(tooltip);

     $('.close-tooltip').on('click', function(){
        closeTooltips();
     });
     
   }

   function closeTooltips() {
      $('.c-tooltip').remove();
   }

    /**
     * Update UI state and manage DOM transitions when the rate type
     * selection has been changed.
     */
    function switchRateTypes() {
      var selected_ratetype = $('input[name=ratetype]:checked', dom.$ratetype_radioset).val();
      switch (selected_ratetype){
        case 'bestrate':
          $('.c-rates-listing__result').not('.c-rates-listing__result--lowestRate').hide();
          $('.c-rates-listing__result--lowestRate:hidden').fadeIn(200);
          break;
        case 'bestclosingcosts':
          $('.c-rates-listing__result').not('.c-rates-listing__result--lowestClosing').hide();
          $('.c-rates-listing__result--lowestClosing:hidden').fadeIn(200);
          break;
        case 'all':
          $('.c-rates-listing__result:hidden').fadeIn(200);
          break;
      }
    }


    /*validation for user registration form */

    function userRegistrationFormValidation() {
      userRegistrationValidator = dom.$user_registration_form.validate({
          rules: {
            fname : {
              required : true
            },
            lname : {
              required : true
            },
            email: {
              required : true,
              email : true
            },
            newfiadvisor : {
              required : true
            },
            newfiadvisorsname : {
              required : true
            }
          },
          messages: {
            fname: "Please enter your firstname",
            lname : "Please enter your lastname",
            email : "Please enter a valid email address",
            newfiadvisor : "Please choose newfi loan advisor",
            newfiadvisorsname : "Please enter your advisor's name"
          }
        });

      return userRegistrationValidator;
    }

    function userqueryFormValidation() {
      userQueryFormValidator = dom.$user_query_form.validate({
          rules: {
            firstname : {
              required : true
            },
            lastname : {
              required : true
            },
            emailid: {
              required : true,
              email : true
            }
          },
          messages: {
            firstname: "Please enter your firstname",
            lastname : "Please enter your lastname",
            emailid : "Please enter a valid email address"
          }
        });

      return userQueryFormValidator;
    }






    /**
     * Helper to remove the rates table fom the DOM
     */
    function destroyRatesTable() {
      dom.$rates_listing__wrapper.empty();
    }

    /**
     * Update UI state and manage DOM transitions when details for
     * a rate are requested.
     * @param  {element} el The element that trigggered this call
     */
    function showRateDetails(el) {
      var
        rateData = state.data_cache.rates.cleaned,
        program_id = $(el).parents('[data-js-program-id]').attr('data-js-program-id'),
        rate_id = $(el).parents('[data-js-rate-id]').attr('data-js-rate-id'),
        program = rateData.programs[program_id],
        rate = rateData.programs[program_id].rates[rate_id]
        ;

      dom.$ratetype_form__wrapper
        .add(dom.$rates_listing__wrapper)
        .not(':hidden').fadeOut(300, function() {
          renderRateDetails(program, rate, program_id, rate_id);
          dom.$rates_listing__wrapper.not(':visible').fadeIn(300);
        });

    }

    /**
     * Update UI state and manage DOM transitions when showing the
     * rates table
     */
    function showRatesTable() {
      var
        promise = state.data_cache.rates.response,
        loadingIndicatorPresent = $('[data-js=rates-loading-indicator]').length
        ;

      // If we're waiting on a response and haven't already, show
      // the loading animation now; otherwise render the rates table
      if (promise.state() !== 'resolved' && !loadingIndicatorPresent) {
        renderRateLoadingIndicator();
      } else {
        renderRatesTable();
      }

    }

    /**
     * Update UI state and manage DOM transitions when showing the
     * Loan Details form
     */
    function showLoanDetailsForm() {
      dom.$loan_form.show();
      dom.$loan_form__collect_details_stage.not(':visible').slideDown(300);
    }

    /**
     * Update UI state and manage DOM transitions when showing the
     * ser registration form
     */
    function showUserRegistration() {
      dom.$ratetype_form__wrapper.not(':hidden').slideUp(200);
      renderChosenRateSummary();
      dom.$user_registration__wrapper
        .css('opacity', 0)
        .slideDown(function(){
          $(this).css('opacity', '1');
        })
        ;
    }

    /**
     * Update UI state and manage DOM transitions when returning the
     * app to the state of collecting Loan Details
     */
    function regressToLoanDetails() {
      $('#basic-information').fadeIn(300);
      dom.$user_registration__wrapper
        .add(dom.$loan_summary)
        .add(dom.$ratetype_form__wrapper)
        .add(dom.$rates_listing__wrapper)
        .not(':hidden').fadeOut(300, function() {
          destroyRatesTable();
          dom.$loan_form
            .not(':visible').fadeIn(300);
        });

        userRegistrationValidator.resetForm();
        
    }

    /**
     * Update UI state and manage DOM transitions when returning the
     * app to the state of picking a rate
     */
    function regressToRateTable() {
      dom.$user_registration__wrapper
        .add(dom.$rates_listing__wrapper)
        .not(':hidden').fadeOut(300, function() {
          showRatesTable();
          dom.$ratetype_form__wrapper
            .add(dom.$rates_listing__wrapper)
            .not(':visible').fadeIn(300);
        });

        userRegistrationValidator.resetForm();

    }




    /**
     * Build rate loading indicator html from template; insert into
     * the DOM and show it
     */
    function renderRateLoadingIndicator() {
      var template = config.templates.rate_loading_animation;

      dom.$rates_listing__wrapper.empty().show().append(template({}));
      toggleFieldsInLoanDetailsForm(state.chosen_loan_type);

    }

    /**
     * Build rate details html from template and rate data; insert
     * into the DOM
     */
    function renderRateDetails(program, rate, program_id, rate_id) {
      var
        template = config.templates.rates_detail,
        context = {
          'program':    program,
          'rate':       rate,
          'program_id': program_id,
          'rate_id':    rate_id
        }
        ;

      dom.$rates_listing__wrapper.empty().append(template(context));
    }

    /**
     * Build rate table html from template and rate results data;
     * insert into the DOM and show it
     */
    function renderRatesTable() {
      var
        chosen_type = state.chosen_loan_type,
        template = config.templates.rates_listing,
        context = state.data_cache.rates.cleaned,
        loadingIndicatorPresent = $('[data-js=rates-loading-indicator]').length
        ;

      if (loadingIndicatorPresent) {
        dom.$rates_listing__wrapper.fadeOut(1000, function(){
          $(this).empty().append(template(context));
          // hide rows that don't meet the currently selected rate type option before showing the table
          switchRateTypes();
          $(this).add(dom.$ratetype_form__wrapper).not(':visible').fadeIn(300);
        });
      } else {
        console.log(context)
        if(context.programs.length > 0) {
          dom.$rates_listing__wrapper.empty().append(template(context));
          switchRateTypes();
          dom.$rates_listing__wrapper.add(dom.$ratetype_form__wrapper).not(':visible').fadeIn(300);
        } else {
          dom.$rate_list_error.fadeIn(300);
        }
        
      }

      // loadQtipsTooltips();
    }

  function loadQtipsTooltips() {
      setTimeout(function(){
            // Rate Column Tooltip
            $('#rateTooltips').qtip({
            content: {
              text: 'The interest rate is the yearly rate charged by lender to a borrower in order for the borrower to obtain a loan. This is expressed as a percentage of the total amount loaned. Note that rates may increase for adjustable rate mortgages.',
              title: '',
              //button: 'Close'
            },
            style: 'qTipsCustomCss',
            position: {
              my: 'top center',  // Position my top left...
              at: 'bottom center', // at the bottom right of...
              target: this // my target
            }
          });

          // APR Column Tooltip
          $('#aprTooltips').qtip({
            content: {
              text: 'Annual percentage rate (APR) is the cost of credit expressed as a yearly rate. The APR includes the interest rate, points, lender fees, and certain other financing charges the borrower is required to pay.',
              title: '',
              //button: 'Close'
            },
            style: 'qTipsCustomCss',
            position: {
              my: 'top center',  // Position my top left...
              at: 'bottom center', // at the bottom right of...
              target: this // my target
            }
          });

          // Monthly Payemnt Column Tooltip
          $('#paymentTooltips').qtip({
            content: {
              text: 'This is the estimated monthly mortgage payment for principal and interest only. This does not include property taxes, homeowner\'s insurance, or mortgage insurance (if applicable), which could increase your monthly payment.',
              title: '',
              //button: 'Close'
            },
            style: 'qTipsCustomCss',
            position: {
              my: 'top center',  // Position my top left...
              at: 'bottom center', // at the bottom right of...
              target: this // my target
            }
          });

          $('#closingTooltips').qtip({
            content: {
              text: 'Click on the Details button for detailed split of the total estimated closing closts',
              title: '',
              //button: 'Close'
            },
            style: 'qTipsCustomCss',
            position: {
              my: 'top center',  // Position my top left...
              at: 'bottom center', // at the bottom right of...
              target: this // my target
            }
          });

        }, 2000);
    }

    /**
     * Build Loan Details Summary html from template and form input;
     * insert into the DOM
     */
    function renderDetailsSummary() {
      var
        chosen_type = state.chosen_loan_type,
        fields_to_summarize = config.loantypes[chosen_type].fields,
        template = config.templates.details_summary,
        context = {'rows': []},
        inputsToFormatAsCurrency = [
          'purchaseprice',
          'estval',
          'curmortgagebalance',
          'cashout'
        ]
        ;

      context.rows.push({'label': 'Loan Type', 'value': dict.loantype_labels[chosen_type]});

      // Iterate through fields and populate context object for summary template
      $.each(fields_to_summarize, function(i, field) {
        var
          label = dict.field_summary_labels[field],
          el = document.getElementById(field),
          value
          ;

        switch (el.tagName) {
          case 'INPUT' :
            value = (el.hasOwnProperty('calculatedValue')) ? el.calculatedValue : el.value;
            break;
          case 'SELECT' :
            value = el.options[el.selectedIndex].text;
            break;
          default:
            value = 'Cannot parse value for this input type';
        }

        if ($.inArray(el.name, inputsToFormatAsCurrency) >= 0) {
          value = accounting.formatMoney(value, {precision: 0});
        }

        context.rows.push({'label': label, 'value': value});
      });

      dom.$loan_form__details_summary_injectionpoint.empty().append(template(context));
    }

    /**
     * Build Rate Summary html from template and selected rate data;
     * insert into the DOM and show
     */
    function renderChosenRateSummary() {
      var
        chosen_program = state.chosen_program,
        chosen_rate = state.chosen_rate,
        template = config.templates.chosen_rate_summary
        ;

      var context = {'rate': chosen_rate, 'program': chosen_program};

      dom.$rates_listing__wrapper.fadeOut(200, function(){
        $(this).empty().append(template(context)).fadeIn(300);
      });
    }


    /**
    * Build a Tooltip's html from template and passed triggering element;
    * insert into the DOM and show
    * @param  {element} el The element that trigggered this call
    */
   function renderTooltip(el) {
     var
       template = config.templates.tooltip,
       context = {},
       $trigger = $(el),
       offset,
       tooltip,
       html
       ;

     // Get the tooltip text from the triggering element's attribute
     html = dict.tooltips[$trigger.attr('data-tooltip-name')];

     // Make sure we have some tooltip text to show
     if (typeof html !== 'undefined') {
       // Build the data to be passsed to the template
       context = {'html': html};
       // Create and return the tooltip dom element
       return $(template(context));
     }
   }




    /**
     * Piece together a JSON object from our loan details form that is
     * compatible with the Newfi REST API
     * @return {json object} A JSON object suitable for posting to
     *     teaserRates REST API.
     */
    function buildRatesDataRequestObj() {
      var
        // Shortcut to the chosen loan type
        chosen_type = state.chosen_loan_type,
        // Prepare values to add to return object
        v = {
          residencetype:      $('#residencetype').val(),
          propertyuse:        $('#propertyuse').val(),
          creditscore:        $('#creditscore').val(),
          fha:                $('#fha').val(),
          zipcode:            $('#zipcode').val(),
          purchaseprice:      accounting.unformat($('#purchaseprice').val()),
          downpaymentpercent: accounting.unformat($('#downpaymentpercent').val()),
          estval:             accounting.unformat($('#estval').val()),
          curmortgagebalance: accounting.unformat($('#curmortgagebalance').val()),
          cashout:            accounting.unformat($('#cashout').val()),
          curmortgagepayment: null, // see note above
        };

      // DRY: calculate downpayment in dollars
      v.downpaymentdollars   = v.purchaseprice * v.downpaymentpercent / 100;

      // Return an object suitable for the chosen loan type
      switch (chosen_type) {
        case 'new-purchase':
          return {
            'loanType':        'PUR',
            'purchaseDetails': {
              'livingSituation': 'homeOwner',
              'housePrice':      v.purchaseprice,
              'loanAmount':      v.purchaseprice - v.downpaymentdollars,
              'zipCode':         v.zipcode
            },
            'livingSituation':        'renting',
            'homeWorthToday':         v.purchaseprice,
            'currentMortgageBalance': v.downpaymentdollars,
            'loanAmount':             v.purchaseprice - v.downpaymentdollars,
            'propertyType':           v.propertyuse,
            'residenceType':          v.residencetype,
            'zipCode':                v.zipcode,
            'creditscore':            v.creditscore + 0
          };
          break;

        case 'refinance':
          return {
            'loanType':               'REF',
            'refinanceOption':        'REFLMP',
            'currentMortgageBalance': v.curmortgagebalance,
            'loanAmount':             v.curmortgagebalance,
            'subordinateFinancing':   null,
            'currentMortgagePayment': v.curmortgagepayment,
            'isIncludeTaxes':         null,
            'impounds':               'YES',
            'propTaxMonthlyOryearly': 'Year',
            'propInsMonthlyOryearly': 'Year',
            'homeWorthToday':         v.estval,
            'propertyType':           v.propertyuse,
            'residenceType':          v.residencetype,
            'zipCode':                v.zipcode,
            'productType':            v.fha,
            'creditscore':            v.creditscore + 0
          };
          break;

        case 'cashout':
          return {
            'loanType':               'REF',
            'refinanceOption':        'REFCO',
            'cashTakeOut':            v.cashout,
            'currentMortgageBalance': v.curmortgagebalance,
            'loanAmount':             v.cashout + v.curmortgagebalance,
            'subordinateFinancing':   null,
            'currentMortgagePayment': v.curmortgagepayment,
            'isIncludeTaxes':         null,
            'impounds':               'YES',
            'propTaxMonthlyOryearly': 'Year',
            'propInsMonthlyOryearly': 'Year',
            'homeWorthToday':         v.estval,
            'propertyType':           v.propertyuse,
            'residenceType':          v.residencetype,
            'zipCode':                v.zipcode,
            'creditscore':            v.creditscore + 0
          };
          break;
      }
    }

    /**
     * Wrapper around the XHR request for rates data from teaserRates
     * API, to handle failed requests and caching valid responses.
     * @return {[jqXHR object]} deferred object, or recursive call
     */
    function getRatesData(attempt) {
      var
        cache = state.data_cache.rates,
        fresh_request = buildRatesDataRequestObj();

      // Avoid calling the API if we already queried it recently with identical paramaters
      if (attempt > 4) {
        // Abort if we've tried getting data too many times.
        // TODO: Inidication to the user that somthing went wrong.
        return;
      } else if (cache.response !== null && _.isEqual(cache.request, fresh_request) ) {
        // We have a cached deferred object; leave it alone
        $('#basic-information').fadeOut(300);
        return;
      } else {
        // Save our request to compare against next tme rates data is requested
        cache.request = fresh_request;
        // Get remote data
        cache.response = getTeaserRateFromRemote(fresh_request);
        // Parse remote data immediately, so it's available for subsequent actions
        cache.response
          .done(function(data){
            cache.cleaned = tranformRatesData(JSON.parse(data));
            console.log(cache.cleaned);

            // Wait to render rates table when we hav valid data

            if(cache.cleaned.programs.length > 0) {
              dom.$rate_list_error.fadeOut(300);
              renderRatesTable();
            } else {
              console.log('no data fetched from the server for this query...........');
              renderError();
            }
            
          })
          .fail(function(){
            // Clear cache and try again
            cache.response = null;
            getRatesData(++attempt);
          })
          ;
      }
    }

    /**
    *Renders error message if data not fetched for a particular query
    **/

    function renderError() {
      var loadingIndicatorPresent = $('[data-js=rates-loading-indicator]').length;

      if (loadingIndicatorPresent) {
        dom.$ratetype_form__wrapper.fadeOut();
        dom.$rates_listing__wrapper.fadeOut();
        dom.$rate_list_error.fadeIn(300);
      }

    }

    /**
     * Request rate details from the Newfi REST API
     * @return  {jqXHR object}  The Ajax call's Promise object
     */
    function getTeaserRateFromRemote(request_obj) {
      console.log(request_obj);
      return $.ajax({
        url:      'http://52.74.75.203:8080/NewfiWeb/rest/calculator/findteaseratevalue',
        type:     'POST',
        data:     {'teaseRate':  JSON.stringify(request_obj)},
        datatype: 'application/json',
        cache:    false
      });
    }

    /**
     * Get a list of advisors from the Newfi REST API; parse the
     * response and store ehatwe require in a cache
     */
    function populateLoanAdvisorListFromRemote() {
      jQuery.ajax({
        url:      '/NewfiWeb/rest/shopper/lasearch',
        type:     'GET',
        datatype: 'application/json',
        data:     request_obj,
        success:  function(response) {
          if (response.error === null && response.resultObject !== undefined){
            // Empty the loan_advisors list if it already exists
            loan_advisors = [];

            // Populate the list from server response
            for (var i=0; i<response.resultObject.length; i++) {
              var advisor = loanAdvisorObjList[i];

              // Only keep what data we need to autocomplete our form field
              loan_advisors.push({
                'name':  advisor.displayName,
                'email': advisor.emailId
              });
            }
          }
        }
        // Do nothing on error; users just won't see an autocomplete list
      });
    }

    /**
     * Record the selection of a rate; trigger the user
     * registration form to show
     * @param  {element} el The element that trigggered this call
     */
    function selectRate(el) {
      var
        rateData = state.data_cache.rates.cleaned,
        program_id = $(el).attr('data-js-program-id'),
        rate_id = $(el).attr('data-js-rate-id'),
        program = rateData.programs[program_id],
        rate = rateData.programs[program_id].rates[rate_id]
        ;

      // record chosen rate and program
      state.chosen_rate = rate;
      state.chosen_program = program;

      showUserRegistration();
    }

    /**
     * Handle Loan Details Form submission.
     */
    function submitLoanDetailsForm() {
      // Build and show summary of details (and hide details form)
      renderDetailsSummary();
      dom.$loan_form.slideUp(300).fadeOut(100);
      dom.$loan_summary.slideDown(300);
      dom.$ratetype_form__wrapper.slideDown(300);

      // Request rates data and rendering of data when we recceive it
      getRatesData(1);
      showRatesTable();
    }

    /* Handle Newfi Advisor */

    function getNewfiAdvisors() {
      $('input[name=newfiadvisor]').on('change', function() {
        if(!lasearch) {
          lasearch = true;
          $.ajax({
            url : "http://52.74.75.203:8080/NewfiWeb/rest/shopper/lasearch",
            method : "GET",
            datatype: "application/json",
            success : function(response) {
              loanAdvisorListCallBack(response);
              autoFillNewfiAdvisors();
            }
          })
        }
      });
    }


    function autoFillNewfiAdvisors() {
      // console.log(loanAdvisorMap)
      $('input[name=newfiadvisorsname]').autocomplete({
        source: loanAdvisorList,
        select: function (event, ui) {
          if(ui.item.value != "" && ui.item.value != undefined) {
            for(var i=0; i < loanAdvisorMap.length; i++) {
              if(loanAdvisorMap[i].name == ui.item.value) {
                $(this).data('email',loanAdvisorMap[i].email);
                break;
              }
            }
          }
        }
  	  });
    }

    /**
     * Handle user registration form submission
     */
    function submitUserRegistration(user_data) {

      var requestData = buildUserRegistrationData();

      var loanManagerEmail = $('#newfiadvisorsname').data('email');

      if(loanManagerEmail != "" && loanManagerEmail != undefined) {
        requestData.loanManagerEmail = loanManagerEmail;
      }

      console.log(requestData);
      //Validates user exists in database or not
      var validateUser = validateUserDetails(requestData);

    }

    /*****
      Handle user query form submission, 
      for user entered information 
      there is no quotation means, 
      user can send the query form submission 
    *****/

    function submitUserQuery(query_obj) {
      var user_query = {};

      user_query.firstName = $('#firstname').val();
      user_query.lastName = $('#lastname').val();
      user_query.emailId = $('#emailid').val() + ":" + new Date().getTimezoneOffset();

      // var requestData = buildUserRegistrationData();
      // var validateUser = validateUserDetails(requestData);

      $.ajax({
        url: 'http://52.74.75.203:8080/NewfiWeb/rest/shopper/record',
        method: 'POST',
        dataType: 'text',
        data: {'registrationDetails' : JSON.stringify(user_query)},
        success: function(data, textStatus, xhr){
          console.log(xhr.status);
          if(xhr.status == 200) {
            Cookies.set("query_page", "query_success");
            window.location.href = "thankYouPage.html";
          }
        }

      });
    }

    function buildUserRegistrationData() {
      var cache = state.data_cache.rates.request;
      var
        // Shortcut to the chosen loan type
        chosen_type = state.chosen_loan_type,
        // Prepare values to add to return object
        v = {
          'firstName' : $('#fname').val(),
          'lastName' : $('#lname').val(),
          'emailId' : $('#email').val() + ":" + new Date().getTimezoneOffset()
        };

      // Return an object suitable for the chosen loan type
      switch (chosen_type) {
        case 'new-purchase':
          return {
            'loanType': {
              "loanTypeCd": "PUR"
            },
            'monthlyRent' : cache.purchaseDetails.housePrice,
            'purchaseDetails': {
              'livingSituation': 'renting',
              'housePrice':      cache.purchaseDetails.housePrice,
              'loanAmount':      cache.purchaseDetails.loanAmount,
              'buyhomeZipPri':   cache.purchaseDetails.zipCode
            },
            "propertyTypeMaster": {
          		'propertyTypeCd': cache.propertyType,
          		'residenceTypeCd': cache.residenceType,
          		'homeZipCode': cache.zipCode
          	},
            'loanAmount':             cache.loanAmount,
            'user' : {
              'firstName': v.firstName,
          		'lastName': v.lastName,
          		'emailId': v.emailId
            }
          };
          break;

        case 'refinance':
          return {
            'loanType':               {
            		"loanTypeCd": "REF"
            	},
              "refinancedetails": {
            		"refinanceOption": "REFLMP",
            		"currentMortgageBalance": cache.currentMortgageBalance,
            		"includeTaxes": cache.isIncludeTaxes
            	},
              "propertyTypeMaster": {
            		"homeWorthToday": cache.homeWorthToday,
            		"homeZipCode": cache.zipCode,
            		"propTaxMonthlyOryearly": cache.propTaxMonthlyOryearly,
            		"propInsMonthlyOryearly": cache.propInsMonthlyOryearly,
            		"propertyTypeCd": cache.propertyType,
            		"residenceTypeCd": cache.residenceType
            	},
            'loanAmount': cache.loanAmount,
            'user' : {
              'firstName': v.firstName,
          		'lastName': v.lastName,
          		'emailId': v.emailId
            }
          };
          break;

        case 'cashout':
          return {
            'loanType':               {
            		"loanTypeCd": "REF"
            	},
              "refinancedetails": {
            		"refinanceOption": "REFCO",
                "cashTakeOut": cache.cashTakeOut,
            		"currentMortgageBalance": cache.currentMortgageBalance,
            		"includeTaxes": cache.isIncludeTaxes
            	},
              "propertyTypeMaster": {
            		"homeWorthToday": cache.homeWorthToday,
            		"homeZipCode": cache.zipCode,
            		"propTaxMonthlyOryearly": cache.propTaxMonthlyOryearly,
            		"propInsMonthlyOryearly": cache.propInsMonthlyOryearly,
            		"propertyTypeCd": cache.propertyType,
            		"residenceTypeCd": cache.residenceType
            	},
            'loanAmount': cache.loanAmount,
            'user' : {
              'firstName': v.firstName,
          		'lastName': v.lastName,
          		'emailId': v.emailId
            }
          };
          break;
      }

    }


    function validateUserDetails(request_data) {
      $.ajax({
        url : 'http://52.74.75.203:8080/NewfiWeb/rest/shopper/validate',
        type : 'POST',
        dataType : 'text',
        data : {'registrationDetails' : JSON.stringify(request_data)},
        success : function(response) {
          var result = JSON.parse(response);
          console.log(result);
          if(result.resultObject) {
            console.log('validation success');
            $('.user-registration-error').hide();
            //Final user data submission with teaserRate data
            createUserAccount(request_data);

          }

          if(result.error) {
            if(result.error.message != "" && result.error.message != undefined) {
              $('.user-registration-error').show();
              $('#registration-error').text(result.error.message);
            }
          }
        },
        error: function (xhr) {
          console.log(xhr);
        }
      });

    }

    function createUserAccount(registration_details) {
      var teaserRate = state.chosen_rate.teaserRate;

      console.log(teaserRate)

      $.ajax({
        url : 'http://52.74.75.203:8080/NewfiWeb/rest/shopper/registration',
        type : 'POST',
        dataType : 'text',
        data : {'registrationDetails' : JSON.stringify(registration_details), 'teaserRateData' : [JSON.stringify(teaserRate)]},
        success : function(response) {
          console.log(response);

          // Redirect to Thank You Page
          if(registration_details && registration_details.user) {              
              Cookies.set('registration_email', registration_details.user.emailId.split(":")[0]);
              window.location.href = "thankYouPage.html";
          }

        },
        error: function (xhr) {
          console.log(xhr);
        }

      });
    }

    function loanAdvisorListCallBack(response) {
      var response = JSON.parse(response);
      if(response.error == null){
        var loanAdvisorObjList = response.resultObject;

        if(loanAdvisorObjList != undefined) {
          for(var i=0; i<loanAdvisorObjList.length; i++) {
            loanAdvisorList.push(loanAdvisorObjList[i].displayName);
            loanAdvisorMap.push({
              name : loanAdvisorObjList[i].displayName,
              email : loanAdvisorObjList[i].emailId
            });
          }
        }
      }
    }




    /**
     * Helper to add custom validators to jQuery.validate plugin.
     */
    function addCustomFormFieldValidators() {
      $.validator.addMethod('required_for_purchase', function(value, element) {
        if (state.chosen_loan_type !== 'new-purchase') {return true;}
        return  element !== '';
      }, 'This field is required');

      $.validator.addMethod('required_for_refi', function(value, element) {
        if (state.chosen_loan_type !== 'refinance') {return true;}
        return  element !== '';
      }, 'This field is required');

      $.validator.addMethod('required_for_cashout', function(value, element) {
        if (state.chosen_loan_type !== 'cashout') {return true;}
        return  element !== '';
      }, 'This field is required');

      $.validator.addMethod('currencyNumber', function(value, element) {
        value = accounting.unformat(value);
        return !isNaN(value) && value * 1 > 0;
      }, 'This field is required');

      $.validator.addMethod('zipCodeValidation', function(value, element) {
        if(isNaN(value)) {
          return false;
        } else {
          return true;
        }
      }, 'Please enter a valid Zip Code in a Newfi approved state: AZ, CA, CO, OR or WA');
    }

    /**
     * Helper to get a property value as a float from any object that has
     * properties with currency-formatedd values.
     * @param  {object} obj          The javascript object to pull a property
     * @param  {string} prop         Value from Property name.
     * @param  {float}  defaultValue Used if the property doesn't exist or
     *     can't be formated as a float.
     * @return {float} The value of the requested property, as a float.
     */
    function propValueOrDefault(obj, prop, defaultValue) {
      var val = defaultValue;
      if (_.has(obj, prop)) {
        // Strip currency formatting
        val = accounting.unformat(obj[prop]);
        // Revert to default if we don'thave a valid number
        if (isNaN(val)) {val = defaultValue;}
      }
      return _.round(1 * val, 0);
    }

    /**
     * Helper to sum "other" third-party fees from a raw API's rate object
     * @param  {object} raw_rateObj  An individual rate object, as returned by the
     *     REST API. (a member of a program's rateVO array)
     * @return {float}  The sum of requested values
     */
    function sumOtherThirdPartyFees(raw_rateObj) {
      var sum = 0;

      _.each(['creditReport805', 'floodCertification807', 'wireFee812', 'notaryfee1110'], function(key){
        sum += propValueOrDefault(raw_rateObj, key, 0.0);
      });
      sum += propValueOrDefault(raw_rateObj, 'recordingFees1202', 87.0);
    }

    /**
     * Helper to remove cosmetic icon flourishes present on
     * initial UI state.
     */
    function removeLoantypeIcons() {
      // TODO: add icon elements and styling
    }

    /**
     * Helper to manage visibility of Newfi Loan Advisor question
     * in user registration form.
     */
    function toggleAdvisorInput() {
      var
        radio      = $('input[name=newfiadvisor]:checked', dom.$user_registration_form),
        name_input = $('#newfiadvisorsname').parents('.c-form-element')
        ;

      if (radio.length === 0) {
        name_input.not('hidden').hide();
      } else if (radio.val() === 'yes') {
        name_input.not('visible').fadeIn(300);
      } else {
        name_input.not('hidden').fadeOut(300);
      }
    }

    /**
     * Helper to manage visibility of required frm elements for
     * a particular Loan type
     * @param  {string} chosen_type Must match one of the values
     *     in config.loantypes
     */
    function toggleFieldsInLoanDetailsForm(chosen_type){
      // Build collections of field elements that should be hidden and visible for the chosen loan type
      var
        visible_fields_selector = $.map(config.loantypes[chosen_type].fields, function(field) {
          return '[data-js=details--'+field+']';
        }).join(','),
        $visible_fields = $(visible_fields_selector),
        $hidden_fields = $('[data-js^=details--]', dom.$loan_form__collect_details_stage).not($visible_fields)
        ;

      // Refine collections to exclude elements already in correct state
      var $fields_to_hide = $hidden_fields.not(':hidden');
      var $fields_to_show = $visible_fields.not(':visible');

      if ($fields_to_hide.length === 0) {
        // If there are no fields to hide, show visible fields immediately
        $fields_to_show.fadeIn(300);
      } else {
        // Otherwise, hide fields first...
        $fields_to_hide.fadeOut( 100, function() {
          // ... and show fields after that animation completes.
          $fields_to_show.fadeIn(300);
        });
      }

    }

    /**
     * Transform raw rates API response into a structure more suitable to
     * our purposes.
     * @return {object} Array of Programs with indiviual rates as children
     */
    function tranformRatesData(result_obj) {
      // Create a container for our transformed set.
      var programs = [];

      // The top-level of the API's result object is a list of Programs.
      _.forEach(result_obj, function(raw_program, raw_program_index) {

        // Add the Program to our container, including only the properties we want to keep
        var program ={
          'name':         raw_program.displayName,
          'product_type': raw_program.productType,
          'rates':        []
        };
        program.display_name = program.name + program.product_type;
        programs.push(program);

        // As we iterate through this program's set of rates, we want to keep track of
        // lowest values, so we can come back and add those states to the rate objects
        // afer the loop.
        var lowest_rate_index = 0;
        var lowest_closing_index = 0;
        var lowest_points_index = 0;

        // Iterate over the program's rates in the raw result object.
        _.forEach(raw_program.rateVO, function(raw_rate, raw_rate_index) {
          /**
           * TODO: Ensure data shown in rates tables and details views is
           * accurate. See following note for details.
           *
           * NOTE: [Jade Orchard, 2017-01-12] We did our best within our
           * prototyping budget to study and refactor code from the existing
           * customer portal to ensure we're meeting functional requirements,
           * but may have missed somthing. The one obvious detrimental change is
           * that we're no longer using the variables and functions defined in
           * common.js, which is clearly shared amongst multiple separate
           * monolithic scripts for different pieces of the application.
           * However, given the interdependent, undocumnted and chaotic nature
           * of the code present in common.js and attendant script files, we
           * didn't feel it prudent to try and incorporate that code here.
          */

          // Build our transformed rate object
          var rate = {
            // 'valueSet':            raw_rate, // leaving here in case we really need original request included

            'tags':                [],
            'rate':                _.round(raw_rate.teaserRate, 3),
            'apr':                 _.round(raw_rate.APR, 3),
            'points':              _.round(raw_rate.point, 3),
            'mo_mortgage':         _.round(accounting.unformat(raw_rate.payment), 0),

            'lender_costs': { // Total Est Lender Costs
              'lender_fee':              propValueOrDefault(raw_rate, 'lenderFee813', 0),
              'loanee_cost':             propValueOrDefault(raw_rate, 'creditOrCharge802', 0),
            },

            'third_party_costs': {
              'appraisal_fee':           propValueOrDefault(raw_rate, 'appraisalFee804', 0),
              'owners_title_ins':        propValueOrDefault(raw_rate, 'ownersTitleInsurance1103', 0),
              'lenders_title_ins':       propValueOrDefault(raw_rate, 'lendersTitleInsurance1104', 0),
              'closing_and_escrow_fees': propValueOrDefault(raw_rate, 'closingEscrowFee1102', 0),
              'other_fees':              sumOtherThirdPartyFees(raw_rate)
            },

            'prepaids': {
              'interest':               propValueOrDefault(raw_rate, 'interest901', 0),
              'homeowners_ins':         propValueOrDefault(raw_rate, 'hazIns903', 0),
              'tax_reserve':            propValueOrDefault(raw_rate, 'taxResrv1004', 0),
              'homeowners_ins_reserve': propValueOrDefault(raw_rate, 'hazInsReserve1002', 0),
            },
            'teaserRate': raw_rate
          };

          rate.total_closing_costs = _.round(
              _.sum(_.values(rate.lender_costs))
            + _.sum(_.values(rate.third_party_costs))
            , 0);

            if(rate.total_closing_costs < 0) {
                rate.total_closing_costs = 0;
            }

          rate.total_prepaids = _.round(
            _.sum(_.values(rate.prepaids))
            , 0);

          var lowest_closing = rate.total_closing_costs;


          if ( lowest_closing == 0){
            lowest_closing_index = raw_rate_index;
          }

          /**
           *
           * In previous portal, the following function adds a preset $25 fee to the
           * result object returned by API:
           *  setNotaryFeeInClosingCostHolder(rate);
           *
           * Don't kow why this is needed, but leaving it here in case it is...
           *
           * Refactored code follows if needed: (requires adding the `valueset`
           * property to rate object above)
          */
          // rate.valueset.notaryfee1110 = '$25.00';

          /**
           * In previous portal, the following function adds properties to the
           * new rate object, to be used with the registration form:
           *  initialiseClosingCostHolderObjectWithFormInput(rate, inputFormOb);
           *
           * I think this an be moved to the registration form itself; no other
           * need for these fields here.
           *
           * refactored code follows if needed:
           */
          // rate.loanType = state.chosen_loan_type;
          // rate.housePrice = (state.chosen_loan_type === 'new-purchase') ?
          //   state.data_cache.rates.request.purchaseDetails.housePrice :
          //   state.data_cache.rates.request.homeWorthToday;

          program.rates.push(rate);

          // Compare values against current lowest; don't run comparison on first item
          if (raw_rate_index > 0) {
            var
              lowest_points  = Math.abs(program.rates[lowest_points_index].points),
              this_points    = Math.abs(rate.points),
              lowest_rate    = program.rates[lowest_rate_index].rate,
              this_rate      = rate.rate
              ;
              // lowest_closing = program.rates[lowest_closing_index].total_closing_costs,
              // this_closing   = rate.total_closing_costs

            if (lowest_points > this_points){
              lowest_points_index = raw_rate_index;
            }

            if ( lowest_rate > this_rate){
              lowest_rate_index = raw_rate_index;
            }
          }

        });

        program.rates[lowest_rate_index].tags.push('lowestRate');
        program.rates[lowest_closing_index].tags.push('lowestClosing');
        program.rates[lowest_points_index].tags.push('lowestPoints');

      });

      console.log(programs)


      // Sort programs into preferred order
      programs = _.sortBy(programs, [function(o) {
        var
          i_name = config.program_name_sort[o.name],
          i_program = config.program_product_sort[o.product_type]
          ;
        return (isNaN(i_name) || isNaN(i_program)) ? '9999999' : i_name + i_program;
      }]);



      // Add index properties to programs and rates, to be used in templates
      return {'programs': programs};

      // Return our parsed object
      return {'programs': programs};
    }




    // Start the show!
    init();

  });
})(jQuery, window, document);
