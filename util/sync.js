'use strict';

module.exports = function sync(request, url, body) {
  return request.post({
    url: url,
    body: body,
    json: true
  }).then(res => {
    console.log('%%%%%%%%%%%%%%%%%');
    console.dir(res, {depth: null});
    console.log('%%%%%%%%%%%%%%%%%');
    return res;
  });
};
