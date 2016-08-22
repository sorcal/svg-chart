(function(angular) {
  angular.module('app.controllers').controller('MainController', function($scope) {
    $scope.points = [];

    /**
     * Фукнция создания точек для графика с рандомными данными
     * @param {int} amount - кол-во точек графика
     */
    function createRandomPoints(amount) {
      for (var i = 0; i < amount; i++) {
        $scope.points.push({
          timestamp: new Date('2016-01-01').getTime() + Math.random() * 365 * 3600 * 24 * 1000,
          value: Math.random() * 100
        });
      }
    }

    createRandomPoints(20);
  });
})(window.angular);
