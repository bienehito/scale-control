# Scale Control: A Liquid Experience

Scale Control is a browser based local competitive two player game where players use jets of liquid to push the ball into their opponent's gate. It was created during the [Game Off 2023](https://itch.io/jam/game-off-2023) game jam. 

### [Play Scale Control](https://bienehito.github.io/scale-control/)

## Gameplay and Mechanics

Game takes place in a vertical aquarium with a slowly sinking main (white) ball and few power-up balls. Player’s jets are located on the bottom of the play field and gates are located on left and right edges. Players control the direction of the jets and can fire them at will. Players score when they push the main ball into the opponent's gate (one on the opposite side of the player's jet). After scoring, the play field is reset. Game continues indefinitely. 

### Ball Scale
Ball will enlarge when it hits the ceiling of the playfield. It will shrink when it hits the bottom of the playfield. The larger the ball is the more difficult it is to control and at some point it will not fit into the gate preventing further scoring. At this point, players are expected to cooperate and let the ball drop to the floor. 

### Power-ups
Game contains smaller power-up balls that are activated when pushed into the opponent's game (like the main ball). The (+) power-up will make the player's jet stronger but will also increase the size of their own gate making the player more vulnerable. Similarly, the (-) power-up will make their jet weaker but will also protect the player by shrinking their gate. Power-ups are stackable and will last 10 seconds after activation of the last power-up.

### Key Gameplay Features
Game has several gameplay aspects that we hope our players will like:

* **Novel medium**. Motion of liquids is uncommon in games and is fun to explore. 
* **Colorful**. Brightly colored dye in the liquid whirls as players fight for the control of the ball.
* **Tactical planning**. Players must anticipate ball movements and plan ahead since water jets do not have an instantaneous effect.
* **Clashing of the jets**. Jets can block and redirect each other.
* **Dual use power-ups**. Power-ups add an additional strategic layer or provide an element of surprise if not directed into the gates strategically.
* **Co-op within a competitive game**. Players are forced to cooperate to advance the game when the ball becomes too large to fit into any gate.


### Controls

On keyboard devices, the left player rotates the jet with A D keys and fires the jet with W key. The right player does so with Left Right and Up keys. In-game help menu is available with the Escape key.

On touch devices, players point and fire jets by taping (and holding) on their side of the device.

## Implementation

Game is implemented with vanilla JavaScript and canvas elements for 2D and 3D graphics. The liquid simulation is published as a separate standalone JS library: bienehito/fluid-dynamics.

## Credits

Game uses music and sound effects from the following sources:

* [YouTube Audio Library](https://www.youtube.com/audiolibrary)
  * Dolphin-esque - Godmode
  * Drown Me Out - VYEN
  * Fugitive Kind - Devon Church
  * Lost and Found - Jeremy Blake
  * Pixelated Autumn Leaves - Jeremy Blake
  * Through The Crystal - Jeremy Blake
  * Ship Bell
  * Small Stream Flowing
* Ascending Bubbles Accent from https://freesfx.co.uk/sfx/

Code references:
* [Light rays shader](https://www.shadertoy.com/view/lljGDt) by ElusivePete

