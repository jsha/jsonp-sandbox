/**
 * Override the handling of jQuery.ajax's jsonp dataType so it gets proxied
 * through an easyXDM iframe on another domain.  This allows receiving the data
 * contents of the JSONP request without ever executing untrusted code in your
 * own document context.  This is also a convenient way to fetch insecure JSONP
 * from a secure page without having it blocked by Chromium 14 and beyond:
 * http://googleonlinesecurity.blogspot.com/2011/06/trying-to-end-mixed-scripting.html
 */
(function(jQuery) {
rpc = new easyXDM.Rpc({
  remote: "box.html"
  }, {
  remote: {
    ajax: {}
  }
});

function myAjax(options) {
  var storedCallbacks = {};
  // TODO handle beforeSend
  // TODO handle lists of callbacks using Deferred
  // XXX test setting options.context
  $.each(["success", "error", "complete"], function(index, cbName) {
    if (options[cbName]) {
      storedCallbacks[cbName] = options[cbName];
      // Remove the callback since it can't pass the frame barrier,
      // but leave a flag indicating the callback is used.  This way we don't
      // have to make a cross-frame call for callbacks that aren't defined.
      options[cbName] = 1;
    }
  });
  if (options.dataFilter) {
    throw new Error("dataFilter unsupported");
  }

  rpc.ajax(options, function(data) {
    $.each(data, function(name, value) {
      if (storedCallbacks[name]) {
        var args = [];
        // turn args from an Array-like Object into an Array
        $.each(value, function(k, v) { args.push(v) });
        storedCallbacks[name].apply(options.context || options, args);
      } else {
        throw new Error("Received a callback for which there was no function");
      }
    });
  });
}

originalJqueryAjax = jQuery.ajax;
jQuery.ajax = function(options) {
  if (options.dataType == "jsonp") {
    return myAjax(options);
  } else {
    return originalJqueryAjax(options);
  }
}

})(jQuery);
