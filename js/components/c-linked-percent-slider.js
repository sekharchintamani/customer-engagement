;(function ($, window, document, undefined) {

  var
    pluginName = 'linkedPercentSlider',
    pluginIdentifier = 0,
    defaults = {
      polyfill: false,
      rangeClass: 'c-linked-percent-slider',
      disabledClass: 'c-linked-percent-slider--disabled',
      activeClass: 'c-linked-percent-slider--active',
      horizontalClass: 'c-linked-percent-slider--horizontal',
      verticalClass: 'c-linked-percent-slider--vertical',
      fillClass: 'c-linked-percent-slider__fill',
      handleClass: 'c-linked-percent-slider__handle'
    };

  // Plugin constructor
  function Plugin(element, options) {
    this.element = element;
    this.$element = $(element);
    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.$percentValue = $('.c-linked-percent-slider__percent-value', this.$element.parent());
    this.$numericValue = $('.c-linked-percent-slider__numeric-value', this.$element.parent());
    this.$linkedInput  = $(this.$element.attr('data-linked-element'));

    this.init();
  }

  Plugin.prototype.init = function () {
    var that = this;

    // Polyfill/enhance the slider input
    var rangesliderOptions = $.extend({}, this.options, {
      onSlide: function(position, value) {
        // Update value labels when sliding
        that.updateValues();

        // The rangeslider plugin doesn't set focus on its underlying input element
        // when interacting with the slider. We'll do it here.
        this.$element.focus();
      }
    });

    this.$element
      .rangeslider(rangesliderOptions)
      .on('input', function() {
        // Update value labels for direct update to input element (ARIA)
        that.updateValues();
      });

    // Update value labels when changing linked input's value
    this.$linkedInput
      .on('change, keyup',function(){
        that.updateValues();
      });

    // Initially set value labels on init
    that.updateValues();
  };

  Plugin.prototype.updateValues = function (rangeslider) {
    var
      linkedValue = this.$linkedInput.val(),
      percent = this.$element.val(),
      product;

    product = accounting.unformat(linkedValue) * percent / 100;

    this.$percentValue.text(percent+'%');

  	if(linkedValue.length == 0 || linkedValue <= 0 || isNaN(product)){
      this.$numericValue.text('');
  	} else {
      this.$numericValue.text('($'+accounting.formatNumber(Math.round(product))+')');
    }

    this.element.calculatedValue = this.$percentValue.text() + " " + this.$numericValue.text();

  };

  // A lightweight plugin wrapper to prevent against multiple instantiations
  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName,
          new Plugin(this, options));
      }
    });
  }

})(jQuery, window, document);
