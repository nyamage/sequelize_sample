const Sequelize = require("sequelize");
const util = require("util");

function getMethods(obj) {
  var res = [];
  for (var m in obj) {
    if (typeof obj[m] == "function") {
      res.push(m);
    }
  }
  return res;
}

// **********************************************
// Prepare configuration of database (sqlite3 in this example)
// **********************************************
const sequelize = new Sequelize("database", "", "", {
  host: "localhost",
  dialect: "sqlite",

  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
  logging: false,
  // SQLite only
  //storage: ":memory:"
  storage: "database.sqlite"
});

// **********************************************
// Test connection
// **********************************************
sequelize
  .authenticate()
  .then(() => {
    console.log("Connection has been established successfully.");
  })
  .catch(err => {
    console.error("Unable to connect to the database:", err);
  });

//**********************************************
// Define models
//**********************************************
const User = sequelize.define("user", {
  firstName: {
    type: Sequelize.STRING
  },
  lastName: {
    type: Sequelize.STRING
  }
});

const Team = sequelize.define("team", {
  name: {
    type: Sequelize.STRING
  }
});
const Player = sequelize.define("player", {
  name: {
    type: Sequelize.STRING
  }
});

const Coach = sequelize.define("coach", {
  name: {
    type: Sequelize.STRING
  }
});

const Fan = sequelize.define("fan", {
  name: {
    type: Sequelize.STRING
  }
});

const Skill = sequelize.define("skill", {
  name: {
    type: Sequelize.STRING
  }
});

//**********************************************
// Define association
//**********************************************
Coach.hasOne(Team);
Player.belongsTo(Team);
Team.hasMany(Player);
Team.hasMany(Fan);
//through is not supported by hasMany
//Player.hasMany(Skill, { through: "PlayerSkill" });
Player.belongsToMany(Skill, { through: "player_skill" });

// **********************************************
// {force: true} indicates drop tabel if exist then re-create it
// **********************************************
sequelize
  .sync({ force: true })
  .then(() => {
    return Promise.all([
      Player.bulkCreate([{ name: "john" }, { name: "bob" }, { name: "ken" }]),
      Skill.bulkCreate([{ name: "run" }, { name: "work" }, { name: "talk" }]),
      Coach.bulkCreate([
        { name: "MrOrange" },
        { name: "MrApple" },
        { name: "MrBanana" }
      ]),
      Team.bulkCreate([
        { name: "Orange" },
        { name: "Apple" },
        { name: "Banana" }
      ])
    ]);
  })
  .then(() => {
    //example for transaction
    return sequelize.transaction(t => {
      const p1 = Skill.findAll({ transaction: t });
      const p2 = Player.findOne({ where: { name: "john" }, transaction: t });
      return Promise.all([p1, p2]).then(([allSkills, john]) => {
        return john.addSkills(allSkills, { transaction: t });
      });
    });
  })
  .then(() => {
    //example for transaction 2
    return sequelize.transaction(t => {
      const p1 = Team.findOne({ where: { name: "Orange" }, transaction: t });
      const p2 = Player.findAll({ transaction: t });
      return Promise.all([p1, p2]).then(([orangeTeam, allPlayers]) => {
        return orangeTeam.addPlayers(allPlayers, { transaction: t });
      });
    });
  })
  .then(() => {
    //raw example
    sequelize.query("SELECT * from players;").spread((results, metadata) => {
      console.log("----------Raw Query example 1---------");
      console.log(`Result of ${metadata.sql}`);
      console.log(results);
    });

    //raw example 2
    sequelize
      .query(
        "select players.name as player_name,skills.name as skills_name from players left join player_skill on players.id = player_skill.playerId left join skills on player_skill.skillId = skills.id"
      )
      .spread((results, metadata) => {
        console.log("----------Raw Query example 2---------");
        console.log(`Result of ${metadata.sql}`);
        console.log(results);
      });
  })
  .then(() => {
    //Simeple Query
    const promises = [];
    promises.push(
      Player.findOne({ where: { name: "john" } }).then(john => {
        console.log("----------Value of John---------");
        console.log(john.get({ plain: true }));
        console.log(JSON.stringify(john));
        console.log("");
      })
    );

    //Query using relation
    promises.push(
      Player.findAll({
        include: [{ model: Skill, where: { name: "run" } }]
      }).then(runablePlayers => {
        console.log("----------Runnable Players--------");
        runablePlayers.forEach(player => {
          console.log(player.get("name"));
        });
      })
    );
    return promises;
  });
