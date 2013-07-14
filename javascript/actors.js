// Derived from example Backbone application 'Actors'
$(function(){

  var Actor = Backbone.Model.extend({

    defaults: function() {
      return {
        title: "empty actor...",
        order: 0,
        active: false,
        selected: false,
        conditions: []
      };
    },

    addCondition: function(condition){
      var newConditions = _.union(this.get('conditions'), [condition]);
      this.save({
        'conditions': newConditions
      });
    },

    removeCondition: function(condition){
      var newConditions = _.reject(this.get('conditions'), function(existing_condition){
        return existing_condition === condition;
      });
      this.save({
        'conditions': newConditions
      });
    },

    removeAllConditions: function() {
      this.save({'conditions':[]});
    },

    rotateConditions: function() {
      var c = this.get('conditions');
      c.push(c.shift());
      this.save({'conditions': c});
    }
  });

  var ActorList = Backbone.Collection.extend({

    model: Actor,

    localStorage: new Backbone.LocalStorage("actors-backbone"),

    comparator: function(x){
      return - parseInt(x.get('order'));
    },

    setActive: function(actor){
      this.where({active: true}).forEach(function(previous) {
        previous.save({active: false});
      });
      actor.save({active: true});
    },

    setSelected: function(actor){
      this.where({selected: true}).forEach(function(previous) {
        previous.save({selected: false});
      });
      actor.save({selected: true});
    }
  });

  var Actors = new ActorList;
  // make available in console for testing
  actors = Actors;

  var ActorView = Backbone.View.extend({

    tagName:  "li",

    attributes : {
      'class' : 'actor-item'
    },

    template: _.template($('#item-template').html()),

    events: {
      "dblclick label"  : "edit",
      "click a.destroy" : "clear",
      "click a.activate" : "activate",
      "keypress .edit"  : "updateOnEnter",
      "blur .edit"      : "close",
      "click a.remove"   : "removeCondition",
      "keypress .input"  : "addConditionOnEnter",
      "click .labels"     : "setConditionFocus",
      "dblclick .actor-initiative" : "editInitiative",
      "keypress .actor-initiative input" : "updateInitiative",
      "blur .actor-initiative input"     : "hideInitiative"
    },

    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'destroy', this.remove);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.$el.toggleClass('active', this.model.get('active'));
      this.$el.toggleClass('selected', this.model.get('selected'));
      this.input = this.$('.edit');
      this.newCondition = this.$('.editable .editor');
      this.initiativeForm = this.$('.actor-initiative .edit-form');
      this.showInitiative = this.$('.actor-initiative .show');
      if (this.model.get('active')) {
        this.moveArrow();
      }

      return this;
    },

    moveArrow: function() {
      $("#arrow").position({
        my:        "right center",
        at:        "left center-30%",
        of:        this.$('.actor-name'),
        collision: "none"
      });
    },

    activate: function() {
      Actors.setActive(this.model);
    },

    edit: function() {
      this.$el.addClass("editing");
      this.input.focus();
    },

    editInitiative: function() {
      this.showInitiative.hide();
      this.initiativeForm.show();
      this.$('.actor-initiative .edit-form input').focus();
    },

    updateInitiative: function(e) {
      if (e.keyCode == 13) {
        var value = this.$('.actor-initiative .edit-form input').val() || 0;
        this.model.save({order: parseInt(value)});
        this.hideInitiative();
      }
    },

    hideInitiative: function() {
      this.showInitiative.show();
      this.initiativeForm.hide();
    },

    close: function() {
      var value = this.input.val();
      if (!value) {
        this.clear();
      } else {
        this.model.save({title: value});
        this.$el.removeClass("editing");
      }
    },

    updateOnEnter: function(e) {
      if (e.keyCode == 13) this.close();
    },

    setConditionFocus: function(e) {
      this.newCondition.val(null);
      this.newCondition.focus();
    },

    addConditionOnEnter: function(e) {
      if (e.keyCode == 13) {
        var target_id = $(e.target).parent().attr('id');
        var condition = this.newCondition.val().replace(/^\s+|\s+$/g,'');
        this.model.addCondition(condition);
      }
    },

    clear: function() {
      this.model.destroy();
    },

    removeCondition: function(e) {
      var target_id = $(e.target).parent().attr('id');
      var condition = target_id.replace(/-/g , " ");
      this.model.removeCondition(condition);
      return false;
    }

  });

  var AppView = Backbone.View.extend({

    el: $("#actorapp"),

    events: {
      "keypress #new-actor":  "createOnEnter",
      "click #activate-next": "activateNext"
    },

    initialize: function() {

      this.input = this.$("#new-actor");

      this.listenTo(Actors, 'add', this.addAll);
      this.listenTo(Actors, 'reset', this.addAll);
      this.listenTo(Actors, 'change:order', this.forceSort);
      this.listenTo(Actors, 'sort', this.reset);

      this.footer = this.$('footer');
      this.main = $('#main');
      this.orderList = $("#actor-list");

      _.bindAll(this);
      $(document).on('keypress', this.commandStroke);

      Actors.fetch();
    },

    reset: function(){
      this.addAll();
    },

    render: function() {
      var remaining = Actors.remaining().length;

      this.main.show();
      this.footer.show();
    },

    forceSort: function(actor) {
      Actors.sort();
    },

    addOne: function(actor) {
      var view = new ActorView({model: actor});
      actor.view = view;
      this.orderList.append(view.render().el);
    },

    addAll: function() {
      this.orderList.empty();
      Actors.each(this.addOne, this);
    },

    activateNext: function() {
      candidate_index = this.activeIndex() + 1;
      target_index = candidate_index == Actors.length ? 0 : candidate_index;
      Actors.setActive(Actors.at(target_index));
    },

    activatePrevious: function() {
      candidate_index  = this.activeIndex() - 1;
      target_index = candidate_index < 0 ? Actors.length - 1 : candidate_index;
      Actors.setActive(Actors.at(target_index));
    },

    upSelect: function() {
      candidate_index = this.selectedIndex() + 1;
      target_index = candidate_index == Actors.length ? 0 : candidate_index;
      Actors.setSelected(Actors.at(target_index));
    },

    downSelect: function() {
      candidate_index  = this.selectedIndex() - 1;
      target_index = candidate_index < 0 ? Actors.length - 1 : candidate_index;
      Actors.setSelected(Actors.at(target_index));
    },

    actorUp: function() {
      current_index = Actors.indexOf(this.selectedActor()) || 0;
      candidate_index  = current_index - 1;
      target_index = candidate_index < 0 ? 0 : candidate_index;
      if (target_index != current_index) {
        target_initiative = parseInt(Actors.at(target_index).get('order')) + 1;
        Actors.at(current_index).save({'order': target_initiative});
      }
      this.renderCurrent();
    },

    actorDown: function() {
      current_index = Actors.indexOf(this.selectedActor()) || 0;
      candidate_index  = current_index + 1;
      target_index = candidate_index == Actors.length ? Actors.length - 1 : candidate_index;
      if (target_index != current_index) {
        candidate_initiative = parseInt(Actors.at(target_index).get('order')) - 1;
        target_initiative = candidate_initiative < 0 ? 0 : candidate_initiative;
        Actors.at(current_index).save({'order': target_initiative});
      }
      this.renderCurrent();
    },

    renderCurrent: function(model) {
      if (this.currentActor()) {
        Actors.setActive(this.currentActor());
      }
    },

    commandStroke: function(e) {
      if (!$(e.target).is('input, textarea')) {
        switch (e.keyCode) {
          case 100:  // 'x'
            this.removeFirstConditionFromActive(); break;
          case 112:  // 'p'
            this.activatePrevious(); break;
          case 114:  // 'r'
            this.rotateActiveConditions(); break;
          case 110:  // 'n'
          case 13:   // Enter
            this.activateNext(); break;
          case 107:  // 'j'
            this.downSelect(); break;
          case 106:  // 'k'
            this.upSelect(); break;
          case 105:  // 'i'
            this.editActiveInitiative(e); break;
          case 97:  // 'a'
            this.addActiveCondition(e); break;
          case 68:  // 'D'
            this.removeAllActiveConditions(); break;
          case 60:  // '<'
            this.actorUp(); break;
          case 62:  // '>'
            this.actorDown(); break;
          case 99:  // 'c'
            this.renderCurrent(); break;
          default:
            console.log('Command key: ' + e.keyCode);
          }
       }
    },

    currentActor: function() {
      return(Actors.where({active:true})[0] || Actors.at(0));
    },

    selectedActor: function() {
      return(Actors.where({selected:true})[0] || Actors.at(0));
    },

    activeIndex: function() {
      return Actors.indexOf(this.currentActor()) || 0
    },

    selectedIndex: function() {
      return Actors.indexOf(this.selectedActor()) || 0
    },

    createOnEnter: function(e) {
      if (e.keyCode != 13) return;
      if (!this.input.val()) return;

      Actors.create({title: this.input.val()});
      this.input.val('');
    },

    editActiveInitiative: function(e) {
      this.selectedActor().view.editInitiative();
      e.preventDefault();
    },

    addActiveCondition: function(e) {
      this.selectedActor().view.setConditionFocus();
      e.preventDefault();
    },

    rotateActiveConditions: function(e) {
      this.selectedActor().rotateConditions();
      this.renderCurrent();
    },

    removeFirstConditionFromActive: function(e) {
      actor = this.selectedActor();
      target = _.first(actor.get('conditions'));
      actor.removeCondition(target);
    },

    removeAllActiveConditions: function() {
      actor = this.selectedActor();
      actor.removeAllConditions();
    }

  });

  var App = new AppView;

});
