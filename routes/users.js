
var User = require('../models/user.js');
var Task = require('../models/task.js');

module.exports = function(router) {

    var usersRoute = router.route('/');

    usersRoute.get(async function(req, res) {
        try {
         var where = {};
         var sort = {};
         var select = {};

         if (req.query.where) {
            try {
                where = JSON.parse(req.query.where);


                
            } catch (error) {
                return res.status(400).json({
                    message:"Invalid where",
                    data: null
                });
            }
         }

         if (req.query.sort) {
            try {
                sort = JSON.parse(req.query.sort);
            } catch (error) {
                return res.status(400).json({
                    message:"Invalid sort",
                    data: null
                });
            }
         }

         if (req.query.select) {
            try {
                select = JSON.parse(req.query.select);
            } catch (error) {
                return res.status(400).json({
                    message:"Invalid select",
                    data: null
                });
            }
         }

         var skip = 0;

         if (req.query.skip != null) {
            skip = Number(req.query.skip);
         }

         if (!Number.isInteger(skip) || skip < 0) {
            return res.status(400).json ({
                message:"Invalid skip",
                data: null

            });

         }

         var limit  = null;
         if (req.query.limit != null) {
            limit = Number (req.query.limit);

            if (!Number.isInteger(limit)||limit < 0) {
                return res.status(400).json({
                    message:"Invalid limit",
                    data:null
                });

            }
         }

         if (Array.isArray(where) || where == null || typeof where != "object"|| Array.isArray(sort) || sort == null || typeof sort != "object" || Array.isArray(select) || select == null || typeof select != "object") {
            return res.status(400).json({
                message: "invalid query",
                data: null
            });
         }

         if (req.query.count == "true") {
            var total = await User.countDucuments(where);

            return res.status(200).json({
                message:"user information get",
                data: total
            });
         }

         var query = User.find(where).sort(sort).select(select).skip(skip);
         if (limit != null) {
            query = query.limit(limit);
         }

         var users = await query;

         res.status(200).json ({
            message : "user information get",
            data: users
         });

        } catch (error) {
            res.status(500).json ({
                message:"Error",
                data:null
            });
        }

        
    });

    //Post
    usersRoute.post(async function(req, res) {
        try {
            var name = req.body.name;
            var email = req.body.email;
            var awaitingTasks = req.body.pendingTasks;

            if (typeof name != "string" || name.trim() == "" ||
             typeof email != "string" || email.trim() == "") {
                return res.status(400).json({
                  message: "Invalid information",
                   data: null
              });
            }

            if (awaitingTasks == null) {
              awaitingTasks = [];
            }

            if (!Array.isArray(awaitingTasks)) {
                return res.status(400).json({
                  message: "Invalid task",
                    data: null
                });
            }

            for (var i = 0; i < awaitingTasks.length; i++) {
                if (typeof awaitingTasks[i] != "string") {
                    return res.status(400).json({
                        message: "Invalid id",
                        data: null

                    });
                }

                if (awaitingTasks.indexOf(awaitingTasks[i]) != i) {
                    return res.status(400).json({
                      message: "Duplicate task",
                        data: null
                    });
                }

                var task = null;

                try {
                    task = await Task.findById(awaitingTasks[i]);
                } catch (error) {
                    return res.status(400).json({
                      message: "Invalid id",
                      data: null
                  });

                }

                if (task == null) {
                    return res.status(404).json({
                        message: "Task not found",
                        data: null
                    });
                }

                if (task.completed == true) {
                    return res.status(400).json({
                      message: "Completed task",
                      data: null
                    });
                }
            }

            var user = new User({
                 name: name,
                email: email,
                pendingTasks: awaitingTasks
            });

            var result = await user.save();

            for (var i = 0; i < awaitingTasks.length; i++) {
                var task = await Task.findById(awaitingTasks[i]);

                if (task.assignedUser != "") {
                    var oldUser = await User.findById(task.assignedUser);

                    if (oldUser != null) {
                        var index = oldUser.pendingTasks.indexOf(task._id.toString());

                        if (index != -1) {
                            oldUser.pendingTasks.splice(index, 1);
                            await oldUser.save();
                        }
                    }
                }

                task.assignedUser = result._id.toString();
                task.assignedUserName = result.name;

                await task.save();
            }

            res.status(201).json({
                message: "User created successfully",
                data: result
            });

        } catch (error) {
            if (error.code == 11000) {
                return res.status(400).json({
                    message: "Email already exists",
                    data: null
                });
            }

            res.status(500).json({
                message: "Error",
                data: null
            });
        }
    });


    //use id to find users
    router.get('/:id', async function(req, res) {
        try {
            var id = req.params.id;
            var select = {};

            var user = await User.findById(id);

            if (user == null) {
                return res.status(404).json({
                    message: "User does not exist",
                    data: null
                });
            }

            if (req.query.select) {
                try {
                    select = JSON.parse(req.query.select);
                } catch (error) {
                    return res.status(400).json({
                        message: "Selected Error,Try new information",
                        data: null
                    });
                }
            }

            user = await User.findById(id).select(select);

            res.status(200).json({
                message: "User information catched",
                data: user
            });

        } catch (error) {
            if (error.name == "CastError") {
                return res.status(404).json({
                    message: "User does not exist",
                    data: null
                });
            }

            res.status(500).json({
                message: "Facing Error",
                data: null
            });
        }
    });


    //adjust users
    router.put('/:id', async function(req, res) {
        try {
            var id = req.params.id;
            var user = await User.findById(id);

            if (user == null) {
                return res.status(404).json({
                    message: "User does not exist",
                    data: null
                });
            }

            var name = req.body.name;
            var email = req.body.email;
            var awaitingTasks = req.body.pendingTasks;

            if (typeof name != "string" || name.trim() == "" ||
                typeof email != "string" || email.trim() == "") {
                return res.status(400).json({
                    message: "Invalid information",
                    data: null
                });
            }

            if (awaitingTasks == null) {
                awaitingTasks = [];
            }

            if (!Array.isArray(awaitingTasks)) {
                return res.status(400).json({
                    message: "Invalid task",
                    data: null
                });
            }

            for (var i = 0; i < awaitingTasks.length; i++) {
                if (typeof awaitingTasks[i] != "string") {
                    return res.status(400).json({
                        message: "Invalid id",
                        data: null
                    });
                }

                if (awaitingTasks.indexOf(awaitingTasks[i]) != i) {
                    return res.status(400).json({
                        message: "Duplicate task",
                        data: null
                    });
                }

                var task = null;

                try {
                    task = await Task.findById(awaitingTasks[i]);
                } catch (error) {
                    return res.status(400).json({
                        message: "Invalid id",
                        data: null
                    });
                }

                if (task == null) {
                    return res.status(404).json({
                        message: "Task not found",
                        data: null
                    });
                }

                if (task.completed == true) {
                    return res.status(400).json({
                        message: "Completed task",
                        data: null
                    });
                }

            }

            var Ouser = await User.findOne({email: email});

            if (Ouser != null && Ouser._id.toString() != id) {
                return res.status(400).json({
                    message: "Email duplicated",
                    data: null

                });
            }
            //remove
            for (var i = 0; i < user.pendingTasks.length; i++) {
              var oldTask = await Task.findById(user.pendingTasks[i]);

                if (oldTask != null && oldTask.assignedUser == id) {
                    if (awaitingTasks.indexOf(oldTask._id.toString()) == -1) {
                      oldTask.assignedUser = "";

                      oldTask.assignedUserName = "unassigned";
                      await oldTask.save();
                    }
                }

            }

            for (var i = 0; i < awaitingTasks.length; i++) {
                var task = await Task.findById(awaitingTasks[i]);

                if (task.assignedUser != "" && task.assignedUser != id) {

                  var oldUser = await User.findById(task.assignedUser);
                    if (oldUser != null) {

                      var index = oldUser.pendingTasks.indexOf(task._id.toString());
                        if (index != -1) {
                            oldUser.pendingTasks.splice(index, 1);
                            await oldUser.save();
                        }
                    }
                }

              task.assignedUser = id;
                task.assignedUserName = name;
                await task.save();

            }

            var tasks = await Task.find({assignedUser: id});

            for (var j = 0; j < tasks.length; j++) {
              tasks[j].assignedUserName = name;
              await tasks[j].save();
            }

            user.name = name;
            user.email = email;
            user.pendingTasks = awaitingTasks;

            var result = await user.save();

            res.status(200).json({
               message: "User updated",
              data: result
            });
        } catch (error) {
            if (error.name == "CastError" && error.path == "_id") {
              return res.status(404).json({
                message: "User does not existd",
                 data: null
              });

            }

            if (error.code == 11000) {
              return res.status(400).json({
                  message: "Email duplicated",
                  data: null
                });
            }

            res.status(500).json({
              message: "Facing Error",
              data: null
            });
        }
    });


    //delete user
    router.delete('/:id', async function(req, res) {

        try {
          var id = req.params.id;
          var user = await User.findById(id);

            if (user == null) {
              return res.status(404).json({
                  message: "User does not exist",
                  data: null
                });
            }

            var tasks = await Task.find({
              assignedUser: id
            });

            for (var i = 0; i < tasks.length; i++) {
              tasks[i].assignedUser = "";
              tasks[i].assignedUserName = "unassigned";
              await tasks[i].save();
            }

            await user.deleteOne();

            res.status(204).send();

        } catch (error) {
            if (error.name == "CastError") {
              return res.status(404).json({
                  message: "User does not exist",
                  data: null

                });
            }
            res.status(500).json({
              message: "Error",
              data: null
            });
        }

    });
    return router;
};
