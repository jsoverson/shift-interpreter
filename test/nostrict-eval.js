exports.eval = function(src, context) {
  let result;
  if (context) {
    with (context) {
      result = eval(src);
    }
  } else result = eval(src);
  return result;
};
