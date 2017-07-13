/**
 * @ngdoc directive
 * @memberOf 'd3.cloud'
 * @name d3-cloud
 * @description
 *   Angular directive wrapping the d3-cloud library.
 *
 * @attr {Object}    events       Optional. An object with a property for each event callback function to be supported. Default: {}.
 * @attr {Function}  filter       Optional. A function that filters words. Invoked for each word, should return true to retain the word, false to skip. Defaults to comparing against ignoreList for legacy purposes.
 * @attr {String}    font         Optional. The name of the font to use. Default: Impact.
 * @attr {Array}     ignoreList   Deprecated. Optional. An array of word names to ignore. Default: [].
 * @attr {Integer}   padding      Optional. The padding to apply between words. Default: 5.
 * @attr {Function}  rotate       Optional. A function reference that calculates rotation per word. Takes word object, and index in 'words' array. Default: alternating 45 degree left/right.
 * @attr {Integer}   slope-base   Optional. The minimum size for words. Default: 2.
 * @attr {Integer}   slope-factor Optional. The scale factor applied to scores. Default: 30.
 * @attr {Array}     words        A binding to an array of objects with name, score and optional color properties.
 *
 * @example
 *   <d3-cloud events="ctrl.wordEvents" font="Impact" filter="ctrl.filter" padding="5"
 *     rotate="ctrl.rotateWord" slope-base="2" slope-factor="30" words="ctrl.words">
 *   </d3-cloud>
 */

/* global d3 */
(function () {

  'use strict';

  angular.module('d3.cloud')
    .directive('d3Cloud', ['$log', d3CloudDirective]);

  d3CloudDirective.$inject = [];

  function d3CloudDirective($log) {
    return {
      restrict: 'E',
      replace: 'true',
      scope: {
        events: '=?',
        font: '@',
        ignoreList: '=?',
        filter: '&?',
        padding: '@',
        rotate: '&?',
        slopeBase: '@',
        slopeFactor: '@',
        words: '='
      },
      templateUrl: function () {
        return '/d3-cloud-ng/d3-cloud.html';
      },
      controller: 'd3CloudController',
      controllerAs: 'ctrl',
      link: function ($scope, $element, $attrs) {
        $scope.events = $scope.events || {};
        $scope.font = $scope.font || 'Impact';
        $scope.ignoreList = $scope.ignoreList || [];
        if ($scope.ignoreList.length > 0) {
          $log.warn('You are using deprecated ignoreList. Please use custom filter function instead.');
        }
        $scope.filter = $scope.filter || function (word) {
            return $scope.ignoreList.indexOf(word.name) === -1;
          };
        var padding = $attrs.padding ? Number($scope.padding) : 5;
        var rotate = $scope.rotate && function (d, i) {
            return $scope.rotate({word: $scope.words[i]});
          } || function () {
            return ~~(Math.random() * 2) * 90 - 45;
          };
        var slopeBase = $attrs.slopeBase ? Number($scope.slopeBase) : 2;
        var slopeFactor = $attrs.slopeFactor ? Number($scope.slopeFactor) : 30;
        $scope.$on('d3-cloud:window-resized', function(event, args) {
          var words = $scope.filterWords($scope.words);
          $scope.updateCloud(words);
        });

        $scope.createCloud = function (words) {
          var cloudWidth = $element[0].clientWidth + 0;
          var cloudHeight = $element[0].clientHeight + 0;
          var minScore = 0;
          var maxScore = 1;
          var slope = 1;

          words.map(function (d) {
            if (minScore > d.score) {
              minScore = d.score;
            }
            if (maxScore < d.score) {
              maxScore = d.score;
            }
          });

          if (maxScore !== minScore) {
            slope = slopeFactor / (maxScore - minScore);
          }

          $scope.cloud = d3.layout.cloud().size([cloudWidth, cloudHeight]);
          $scope.cloud
            .words(words.map(function (d) {
              var result = {
                text: d.name,
                size: d.score * slope + slopeBase
              };
              if (d.color) {
                result.color = d.color;
              }
              return result;
            }))
            .padding(padding)
            .rotate(rotate)
            .font($scope.font)
            .fontSize(function (d) {
              return d.size;
            })
            .on('end', draw)
            .start();
        };

        $scope.updateCloud = function (words) {

          var cloudHeight = $element[0].clientHeight + 0;
          var cloudWidth = $element[0].clientWidth + 0;
          var minScore = 0;
          var maxScore = 1;
          var slope = 1;

          words.map(function (d) {
            if (minScore > d.score) {
              minScore = d.score;
            }
            if (maxScore < d.score) {
              maxScore = d.score;
            }
          });

          if (maxScore !== minScore) {
            slope = slopeFactor / (maxScore - minScore);
          }

          $scope.cloud = d3.layout.cloud().size([cloudWidth, cloudHeight]);
          $scope.cloud
            .words(words.map(function (d) {
              var result = {
                text: d.name,
                size: d.score * slope + slopeBase
              };
              if (d.color) {
                result.color = d.color;
              }
              return result;
            }))
            .padding(padding)
            .rotate(rotate)
            .font($scope.font)
            .fontSize(function (d) {
              return d.size;
            })
            .on('end', update)
            .start();
        };

        if (!$scope.cloud && $scope.words && $scope.words.length) {
          $scope.createCloud($scope.words);
        }

        function update(data) {
          var size = $scope.cloud.size();
          var fill = (d3.schemeCategory20 ? d3.schemeCategory20 : d3.scale.category20());
          var words = d3.select($element[0]).select('svg')
            .selectAll('g')
            .attr('transform', 'translate(' + size[0] / 2 + ',' + size[1] / 2 + ')')
            .selectAll('text')
            .data(data);

          // append new text elements
          words.enter().append('text');

          // update all words in the word cloud (when you append
          // nodes from the 'enter' selection, d3 will add the new
          // nodes to the 'update' selection, thus all of them will
          // be updated here.
          words.style('font-size', function (d) {
            return d.size + 'px';
          })
            .style('font-family', $scope.font)
            .style('fill', function (d, i) {
              if (data[i].color) {
                return data[i].color;
              }
              return fill(i);
            })
            .attr('text-anchor', 'middle')
            .attr('transform', function (d) {
              return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
            })
            .on($scope.events)
            .text(function (d) {
              return d.text;
            });
          words.exit().remove(); // new line to remove all unused words
        }

        function draw(words) {
          var size = $scope.cloud.size();
          var fill = (d3.schemeCategory20 ? d3.schemeCategory20 : d3.scale.category20());
          d3.select($element[0]).append('svg')
            .attr('width', size[0])
            .attr('height', size[1])
            .append('g')
            .attr('transform', 'translate(' + size[0] / 2 + ',' + size[1] / 2 + ')')
            .selectAll('text')
            .data(words)
            .enter().append('text')
            .style('font-size', function (d) {
              return d.size + 'px';
            })
            .style('font-family', $scope.font)
            .style('fill', function (d, i) {
              if (words[i].color) {
                return words[i].color;
              }
              return fill(i);
            })
            .attr('text-anchor', 'middle')
            .attr('transform', function (d) {
              return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
            })
            .on($scope.events)
            .text(function (d) {
              return d.text;
            });
        }
      }
    };
  }

}());
