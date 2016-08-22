(function(angular) {
  var X_AXIS_LABELS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var HORIZONTAL_SEGMENTS = 5; // кол-во промежутков значений по оси Y (которые будут отделены горизонтальными линиями)

  /**
   * Контроллер
   * @param {Function} $filter - $filter
   */
  function svgChartController($filter) {
    var YScaleFactor = 1; // поправочный коэффициент для значений точек (координата Y)

    var scope = this;
    scope.svgWidth = 1000; // ширина svg-объекта
    scope.svgHeight = 300; // высота svg-объекта
    scope.viewportWidth = 970; // ширина svg-графика
    scope.viewportHeight = 280; // высота svg-графика
    scope.zeroPoint = [30, 70]; // начало координат самого графика
    scope.horLines = []; // данные о горизонтальных линиях и значениях на оси Y на графике
    scope.vertLabels = []; // данные о значениях на оси X на графике

    scope.currentYear = ''; // текущий год на графике

    scope.graphPath = null; // строка, описывающая ломаную значений (svg path)
    scope.curPoint = null; // активная точка на карте
    scope.curPointLine = ''; // активная

    scope.points = angular.copy(scope.items, []);

    /**
     * Расчет поправочного коэффициента (на случай, если значения точек будут > 100)
     */
    function calcYScaleFactor() {
      var minPointVal;
      var maxPointVal;
      var i;
      for (i = 0; i < scope.points.length; i++) {
        var point = scope.points[i];
        if (typeof minPointVal === 'undefined' || point.value < minPointVal) {
          minPointVal = point.value;
        }
        if (typeof maxPointVal === 'undefined' || point.value > maxPointVal) {
          maxPointVal = point.value;
        }
      }
      var digitsLen = Math.round(maxPointVal - minPointVal).toString().length - 1;
      var mutiplier = Math.pow(10, digitsLen);
      var yStep = Math.ceil(((maxPointVal - minPointVal) / HORIZONTAL_SEGMENTS) / mutiplier) * mutiplier;
      YScaleFactor = 100 / yStep / HORIZONTAL_SEGMENTS;
    }

    /**
     * Функция подготовки данных для осей координат и горизонтальных линий
     */
    function createAxes() {
      var xStep = Math.floor((scope.viewportHeight - scope.zeroPoint[1]) / HORIZONTAL_SEGMENTS);
      var i;
      for (i = 0; i <= HORIZONTAL_SEGMENTS; i++) {
        var y = xStep * i;
        scope.horLines.push({
          label: (HORIZONTAL_SEGMENTS - i) * 20 / YScaleFactor,
          x1: scope.zeroPoint[0],
          x2: scope.viewportWidth,
          y1: y,
          y2: y
        });
      }

      var yStep = Math.floor((scope.viewportWidth - scope.zeroPoint[0]) / X_AXIS_LABELS.length);
      for (i = 0; i < X_AXIS_LABELS.length; i++) {
        var x = yStep * i + scope.zeroPoint[0] + 20;
        scope.vertLabels.push({
          label: X_AXIS_LABELS[i],
          x: x,
          y: scope.viewportHeight - scope.zeroPoint[1] + 30
        });
      }
    }

    /**
     * Расчет окрестности точки, нахождение курсора мыши в которой будет активировать данную точку
     * @param {Array} points - массив всех точек
     * @param {int} i - порядковый номер точки в массиве
     */
    function calcPointNeighborhood(points, i) {
      var point = points[i];
      point.xRange = [point.x, point.x];
      if (i > 0) {
        var previousPoint = points[i - 1];
        point.xRange[0] = (previousPoint.xRange[1] + point.xRange[0]) / 2;
        previousPoint.xRange[1] = point.xRange[0];
      }
    }

    /**
     * Расчет svg координат треугольника (иконка направления изменения значения точки по сравнению с предыдущей)
     * @param {Object} delta - массив всех точек
     */
    function appendDeltaArrow(delta) {
      delta.arrow = {
        points: delta.value >= 0 ?
        (delta.x - 6) + ',' + (delta.y - 8) + ' ' + (delta.x - 2) + ',' + (delta.y) + ' ' + (delta.x - 10) + ',' + (delta.y) :
        (delta.x - 2) + ',' + (delta.y - 8) + ' ' + (delta.x - 10) + ',' + (delta.y - 8) + ' ' + (delta.x - 6) + ',' + (delta.y)
      };
    }

    /**
     * Расчет положения и значений появляющего инфоблока точки
     * @param {Array} points - массив всех точек
     * @param {int} i - порядковый номер точки в массиве
     */
    function appendPointInfoData(points, i) {
      var point = points[i];

      var rectangle = { // информация о прямоугольнике инфорблока
        x: point.x + 10,
        y: point.y - 60,
        width: 140,
        height: 50
      };

      if (rectangle.y < 0) { // коррекция положения инфоблока для верхних точек
        rectangle.y += rectangle.height + 10;
      }
      if (scope.viewportWidth - rectangle.x < rectangle.width) { // коррекция положения инфоблока для правых точек
        rectangle.x -= rectangle.width + 20;
      }

      point.info = {};
      point.info.date = { // дата и ее координаты
        value: $filter('date')(new Date(point.timestamp), 'd MMMM yyyy'),
        x: rectangle.x + 10,
        y: rectangle.y + 20
      };
      point.info.val = { // значение точки и ее координаты
        x: rectangle.x + 10,
        y: rectangle.y + 40,
        value: point.value
      };
      point.info.rectangle = rectangle;

      if (i > 0) {
        var previousPoint = points[i - 1];
        var deltaVal = point.value - previousPoint.value;
        point.info.delta = { // значение изменения по сравнению с предыдущим значение
          value: deltaVal,
          x: rectangle.x + 80,
          y: rectangle.y + 40
        };
        appendDeltaArrow(point.info.delta);
      }

      // svg path для пунктирной линии от точки вниз
      point.info.bottomLine = ['M', point.x, ' ', point.y, ' L ', point.x, ' ', scope.viewportHeight - 70].join('');
    }

    /**
     * подготовки данных точек
     */
    function preparePoints() {
      scope.points.sort(function(a, b) {
        return a.timestamp >= b.timestamp ? 1 : -1;
      });

      var firstPoint = scope.points[0];
      scope.currentYear = new Date(firstPoint.timestamp).getFullYear();
      var startYearTimestamp = new Date(scope.currentYear + '-01-01').getTime();
      var endYearTimestamp = new Date(scope.currentYear + '-12-31').getTime();
      // множитель для расчета внутренней координаты svg на основе timestamp
      var xStepTime = (scope.viewportWidth - scope.zeroPoint[0]) / (endYearTimestamp - startYearTimestamp);

      var pathArr = []; // массив svg частей path для точек
      for (var i = 0; i < scope.points.length; i++) {
        var point = scope.points[i];
        point.x = xStepTime * (point.timestamp - startYearTimestamp) + scope.zeroPoint[0];
        point.y = (100 - point.value * YScaleFactor) * (scope.viewportHeight - scope.zeroPoint[1]) / 100;

        calcPointNeighborhood(scope.points, i);
        appendPointInfoData(scope.points, i);

        pathArr.push((i ? 'L ' : 'M') + point.x + ' ' + point.y);
      }
      scope.graphPath = pathArr.join(' ');
    }

    createAxes();
    calcYScaleFactor();
    preparePoints();

    var xMouseShift = 0; // коррекция положения svg-графика относительно страницы по оси Х
    /**
     * Отображение/скрытие элементов активной точки графика
     * @param {Object} ev - объект события
     */
    scope.togglePointDetail = function(ev) {
      if (ev.offsetX > 0) {
        xMouseShift = ev.offsetX - ev.clientX;
      }
      var pointFound;
      for (var i = 0; i < scope.points.length; i++) {
        var point = scope.points[i];
        if (ev.clientX + xMouseShift > point.xRange[0] && ev.clientX + xMouseShift < point.xRange[1]) {
          pointFound = point;
          break;
        }
      }
      if (pointFound && ev.offsetY > 0 && ev.offsetY < scope.viewportHeight - 70) {
        if (!scope.curPoint || scope.curPoint.timestamp !== pointFound.timestamp) {
          scope.curPoint = pointFound;
        }
      } else {
        delete scope.curPoint;
        delete scope.curPointLine;
      }
    };
  }

  angular.module('app.components').component('svgChart', {
    restrict: 'E',
    templateUrl: 'views/svgChart.html',
    bindings: {
      items: '='
    },
    controller: svgChartController
  });
})(window.angular);
