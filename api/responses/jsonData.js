
module.exports = function jsonData(data) {
  return this.res.status(200).json(data);
}