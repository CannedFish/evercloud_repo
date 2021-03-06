CloudApp.controller('HeatController',
    function($rootScope, $scope, $filter, $modal, $i18next, $ngBootbox,
             CommonHttpService, ToastrService, ngTableParams, ngTableHelper,
             Heat, CheckboxGroup, DataCenter, Image){

        $scope.$on('$viewContentLoaded', function(){
                Metronic.initAjax();
        });

        $scope.heats = [];
        var checkboxGroup = $scope.checkboxGroup = CheckboxGroup.init($scope.heats);

        $scope.heat_table = new ngTableParams({
                page: 1,
                count: 10
            },{
                counts: [],
                getData: function($defer, params){
                    Heat.query(function(data){
                        $scope.heats = ngTableHelper.paginate(data, $defer, params);
                        checkboxGroup.syncObjects($scope.heats);
                    });
                }
            });

        var deleteHeats = function(ids){

            $ngBootbox.confirm($i18next("heat.confirm_delete")).then(function(){

                if(typeof ids == 'function'){
                    ids = ids();
                }

                CommonHttpService.post("/api/heat/batch-delete/", {ids: ids}).then(function(data){
                    if (data.success) {
                        ToastrService.success(data.msg, $i18next("success"));
                        $scope.heat_table.reload();
                        checkboxGroup.uncheck()
                    } else {
                        ToastrService.error(data.msg, $i18next("op_failed"));
                    }
                });
            });
        };

        $scope.batchDelete = function(){

            deleteHeats(function(){
                var ids = [];

                checkboxGroup.forEachChecked(function(heat){
                    if(heat.checked){
                        ids.push(heat.id);
                    }
                });

                return ids;
            });
        };

        $scope.delete = function(heat){
            deleteHeats([heat.id]);
        };


        $scope.edit = function(heat){

            $modal.open({
                templateUrl: 'update.html',
                controller: 'HeatUpdateController',
                backdrop: "static",
                size: 'lg',
                resolve: {
                    heat_table: function () {
                        return $scope.heat_table;
                    },
                    heat: function(){return heat}
                }
            });
        };

        $scope.openNewHeatModal = function(heat){
            $modal.open({
                templateUrl: 'new-heat.html',
                backdrop: "static",
                controller: 'NewHeatController',
                size: 'lg',
                resolve: {
                    dataCenters: function(){
                        return DataCenter.query().$promise;
                    },
                    tenant_id: function(){
                        return heat.tenant_id;
                    },
		    images: function(){
                        return Image.query().$promise;
                    },
		    heat_table: function(){
			return $scope.heat_table;
		    }

                }
            }).result.then(function(){
                $scope.heat_table.reload();
            });
        };
    })

.controller('HeatDetailController', function ($rootScope, $scope, $filter, $state, $modal, $i18next, $ngBootbox,
             CommonHttpService, ToastrService, ngTableParams, ngTableHelper,
             Heat, CheckboxGroup, DataCenter, tenant_id){

    $scope.$on('$viewContentLoaded', function () {
        Metronic.initAjax();
    });

    $scope.tenant_id = tenant_id;
    $scope.usergroupList = [];
    $scope.test = []

    $scope.ruleList = [];

    $scope.HeatDetail_table = new ngTableParams({
        page: 1,
        count: 10
    }, {
        counts: [],
        getData: function ($defer, params) {
            CommonHttpService.get("/api/heat/details/" + tenant_id + "/").then(function (data) {
                $scope.ruleList = ngTableHelper.paginate(data, $defer, params);
            });
        }
    });

    $scope.checkboxes = {'checked': false, items: {}};

    $scope.$watch('checkboxes.checked', function (value) {
        angular.forEach($scope.ruleList, function (item) {
            if (angular.isDefined(item.id)) {
                $scope.checkboxes.items[item.id] = value;
            }
        });
    });

    $scope.$watch('checkboxes.items', function (values) {
        $scope.checked_count = 0;
        if (!$scope.ruleList) {
            return;
        }
        var checked = 0, unchecked = 0,
            total = $scope.ruleList.length;

        angular.forEach($scope.ruleList, function (item) {
            checked += ($scope.checkboxes.items[item.id]) || 0;
            unchecked += (!$scope.checkboxes.items[item.id]) || 0;
        });
        if ((unchecked == 0) || (checked == 0)) {
            $scope.checkboxes.checked = ((checked == total) && total != 0);
        }

        $scope.checked_count = checked;
        angular.element(document.getElementById("select_all")).prop("indeterminate", (checked != 0 && unchecked != 0));
    }, true);


    $scope.modal_add_group_user = function () {
        $modal.open({
            templateUrl: 'add_group_user.html',
            controller: 'AddGroupUserController',
            backdrop: "static",
            resolve: {
                group_id: function () {
                    return $scope.group_id;
                },
                users: function () {
                    return users = User.getActiveUsers();
                }
            }
        }).result.then(function () {
                $scope.UserGrouperDetail_table.reload();
            }, function () {

            });
    };

    $scope.delete_action = function (ug) {
        bootbox.confirm($i18next("heat.confirm_delete_heat"), function (confirm) {
            if (confirm) {
                var post_data = {
                    "heat_id": ug.id
                };

                CommonHttpService.post("/api/heat/deleteheat/", post_data).then(function (data) {
                    if (data.success) {
                        ToastrService.success(data.msg, $i18next("success"));
                        $scope.HeatDetail_table.reload();
                    } else {
                        ToastrService.error(data.msg, $i18next("op_failed"));
                    }
                    ug.is_unstable = false;
                });
            }
        });
    };
})

    .controller('NewHeatController',
        function($scope, $modalInstance, $i18next,$http, heat_table,DatePicker,
                 CommonHttpService, ToastrService, dataCenters){

            var form = null;
            $modalInstance.rendered.then(function(){
		Metronic.initAjax();
        	DatePicker.initDatePickers();
                form = HeatForm.init($scope.site_config.WORKFLOW_ENABLED);
            });

            $scope.dataCenters = dataCenters;
            $scope.user = {is_resource_user: false, is_approver: false};
            $scope.is_submitting = false;
            $scope.cancel = $modalInstance.dismiss;
/*            var upload_file = function(){
                var file = document.getElementById('id_file').files[0];
                //return file
                var r = new FileReader();
                r.readAsBinaryString(file);
                r.onloadend = function(e){
                    $scope.heat.file = e.target.result;
                //                                                                                                //send your binary data via $http or $resource or do anything else with it
                    }
                }*/
	    $scope.create = function(){

                if(form.valid() == false){
                    return;
                }
                $scope.is_submitting = true;
		
		$http({method:'POST',
                        url:'/api/heat/create/',
                        headers:{'Content-Type':undefined},
                        transformRequest: function(data){
                                var formData = new FormData();
                                formData.append('heatname',$scope.heat.heatname);
                                formData.append('description',$scope.heat.description);
                                formData.append('start_date',$scope.heat.start_date);
                                //formData.append('image',$scope.heat.image);
                                formData.append('file', document.getElementById('id_file').files[0]);
                                formData.append('file_name', document.getElementById('id_file').value);
                                return formData;
                        }
                }
                ).success(function(data, status, headers, config){
                        ToastrService.success($i18next("success"));
                        heat_table.reload();
                        $modalInstance.dismiss();
                    }).error(function(data, status, headers, config) {
                    }
                );
/*

                CommonHttpService.post('/api/heat/create/', $scope.heat).then(function(result){
                    if(result.success){
                        ToastrService.success(result.msg, $i18next("success"));
                        $modalInstance.close();
                    } else {
                        ToastrService.error(result.msg, $i18next("op_failed"));
                    }
                    $scope.is_submitting = true;
                }).finally(function(){
                    $scope.is_submitting = false;
                });*/
            };
        }

   ).factory('HeatForm', ['ValidationTool', '$i18next',
        function(ValidationTool, $i18next){
            return {
                init: function(){

                    var config = {

                        rules: {
                            heatname: {
                                required: true,
                                remote: {
                                    url: "/api/heat/is-name-unique/",
                                    data: {
                                        heatname: $("#heatname").val()
                                    },
                                    async: false
                                }
                            },
			    description:{required: true},
			    start_date:{required: true},
			    file:{required: true},
                            user_type: 'required'
                        },
                        messages: {
                            heatname: {
                                remote: $i18next('heat.name_is_used')
                            },
                        },
                        errorPlacement: function (error, element) {

                            var name = angular.element(element).attr('name');
                            if(name != 'user_type'){
                                error.insertAfter(element);
                            }
                        }
                    };

                    return ValidationTool.init('#heatForm', config);
                }
            }
        }]).controller('HeatUpdateController',
        function($rootScope, $scope, $modalInstance, $i18next,
                 heat, heat_table,
                 Heat, UserDataCenter, heatForm,
                 CommonHttpService, ToastrService, ResourceTool){

            $scope.heat = heat = angular.copy(heat);

            $modalInstance.rendered.then(heatForm.init);

            $scope.cancel = function () {
                $modalInstance.dismiss();
            };


            var form = null;
            $modalInstance.rendered.then(function(){
                form = heatForm.init($scope.site_config.WORKFLOW_ENABLED);
            });
            $scope.submit = function(heat){

                if(!$("#HeatForm").validate().form()){
                    return;
                }

                heat = ResourceTool.copy_only_data(heat);


                CommonHttpService.post("/api/heat/update/", heat).then(function(data){
                    if (data.success) {
                        ToastrService.success(data.msg, $i18next("success"));
                        heat_table.reload();
                        $modalInstance.dismiss();
                    } else {
                        ToastrService.error(data.msg, $i18next("op_failed"));
                    }
                });
            };
        }
   ).factory('heatForm', ['ValidationTool', '$i18next',
        function(ValidationTool, $i18next){
            return {
                init: function(){

                    var config = {

                        rules: {
                            heatname: {
                                required: true,
                                remote: {
                                    url: "/api/heat/is-name-unique/",
                                    data: {
                                        heatname: $("#heatname").val()
                                    },
                                    async: false
                                }
                            },
                            user_type: 'required'
                        },
                        messages: {
                            heatname: {
                                remote: $i18next('heat.name_is_used')
                            },
                        },
                        errorPlacement: function (error, element) {

                            var name = angular.element(element).attr('name');
                            if(name != 'user_type'){
                                error.insertAfter(element);
                            }
                        }
                    };

                    return ValidationTool.init('#HeatForm', config);
                }
            }
        }]);
