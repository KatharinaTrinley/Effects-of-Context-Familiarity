PennController.ResetPrefix(null);
SetCounter("setcounter", 0); // 0 entspricht Gruppe A, 1 entspricht Gruppe B, ,... bis Gruppe L

// Header
DebugOff();

// Function for conditional shuffling to exclude consecutive duplicates
function RandomizeExcludeDouble(ar) {
    this.args = ar;
    this.run = function (arrays) {
        let sequence = arrays[0];
        let shuffle = true;
        while (shuffle) {
            shuffle = false;
            fisherYates(sequence);
            let prev = "", next = "";
            for (let i = 0; i < sequence.length; i++) {
                if (i > 0) prev = sequence[i - 1][0].type;
                next = sequence[i][0].type;
                if (prev == next) {
                    shuffle = true;
                    break;
                }
            }
        }
        return sequence;
    };
}

// Wrapper function for RandomizeExcludeDouble
function randomizeExcludeDouble(ar) {
    return new RandomizeExcludeDouble([ar]);
}

// Dashed function to allow for manual line breaks
dashed = (name, sentence) => [
    newText(name, "").css({
        display: 'flex',
        'flex-direction': 'row',
        'flex-wrap': 'wrap',
        'line-height': '4em',
        'max-width': '70em',
        'min-width': '70em'
    }).print(),
    ...sentence.split(/[*<>]+/).map((w, i) => (w == "br" ?
        newText("").css("width", "100vw").print(getText(name)) :
        newText(name + '-' + i, w.replace(/./g, '_'))
            .css({
                margin: "0em 0.2em",
                'font-family': 'monospace',
                "font-size": "12pt", //was 14pt
                "color": "gray"
            })
            .print(getText(name))
    ))
    ,
    newKey(name + '-start', " ").log().wait(),
    ...sentence.split(/[*<>]+/).map((w, i) => (w != "br" ? [
        getText(name + '-' + i).text(w).css({
            "color": "black"
        }),
        newKey(i + "-" + w, " ").log().wait(),
        getText(name + '-' + i).text(w.replace(/./g, '_')).css({
            "color": "gray"
        })
    ] : null))
];

// Including a break using sepWidthN
function SepWithN(sep, main, n) {
    this.args = [sep, main];

    this.run = function (arrays) {
        assert(arrays.length == 2, "Wrong number of arguments (or bad argument) to SepWithN");
        assert(parseInt(n) > 0, "N must be a positive number");
        let sep = arrays[0];
        let main = arrays[1];

        if (main.length <= 1)
            return main;
        else {
            let newArray = [];
            while (main.length) {
                for (let i = 0; i < n && main.length > 0; i++)
                    newArray.push(main.shift());
                for (let j = 0; j < sep.length && main.length > 0; ++j)
                    newArray.push(sep[j]);
            }
            return newArray;
        }
    };
}

// Wrapper function for SepWithN
function sepWithN(sep, main, n) {
    return new SepWithN(sep, main, n);
}

const askQuestion = (successCallback, failureCallback, waitTime) => (row) => (
    row.QUESTION && row.QUESTION == "1" ? [
        newText("question_text", row.QUESTIONTEXT),
        newText("answer_expected", row.CORRECT),

        // Format the page that displays the question and the answer options
        newCanvas("Canvas", 600, 100)
            .center()
            .add(0, 0, newText(row.QUESTIONTEXT)
                .css("font-family", "courier")
                .css("font-size", "14pt"))
            .add(0, 50, newText("f = NEIN")
                .css("font-family", "courier")
                .css("font-size", "14pt"))
            .add(300, 50, newText("j = JA")
                .css("font-family", "courier")
                .css("font-size", "14pt"))
            .print(),

        newKey("answerTarget", "fj").log().wait(),
        getKey("answerTarget")
            .test.pressed(row.CORRECT)
            .success(newText("<b>Korrekt!</b>")
                .color("Green")
                .css("font-family", "courier")
                .css("font-size", "14pt")
                .center()
                .print())
            .failure(newText("<b>Falsche Antwort...</b>")
                .color("Crimson")
                .css("font-family", "courier")
                .css("font-size", "14pt")
                .center()
                .print()),

        // Wait for feedback
        newTimer("wait", waitTime)
            .start()
            .wait()
    ] : []
);

// Functions for question answering
const askExerciseQuestion = askQuestion(
    () => [newText("<b>Korrekt!</b>")
        .color("Green")
        .center()
        .print()],
    () => [newText("<b>Falsche Antwort</b>")
        .color("Crimson")
        .center()
        .print()],
    1000
);

const askTrialQuestion = askQuestion(
    () => [getVar("ACCURACY").set(v => [...v, true])],
    () => [
        getVar("ACCURACY").set(v => [...v, false]),
        newText("<b>Falsche Antwort</b>")
            .color("Crimson")
            .center()
            .print(),
        getText("answer_wrong").css("border-bottom", "5px solid lightCoral"),
        // Penalty for the wrong answer is waiting 1000 ms before continuing
        newTimer("wait", 1000)
            .start()
            .wait()
    ],
    300
);

// Display a primer
const newPrimer = () => [
    newText('primer', '*')
        .css({
            "font-size": "30pt",
            "margin-top": "8px"
        })
        .center()
        .print(),
    newTimer("waitprimer", 400)
        .start()
        .wait(),
    newKey(" ")
        .wait(),
    getText('primer').remove(),
];

// Declare global variables in the header
Header(
    newVar("ID").global(),
    newVar("ACCURACY", []).global(),
    newVar("fragebogen_2Response").global(),
    newVar("question1Response").global(),
    newVar("question2Response").global(),
    newVar("question3Response").global()
)
    .log("id", getVar("ID"));

// Main sequence of the experiment
Sequence("ethics", "participants", "instructions", "exercise", "start_experiment", 
    randomizeExcludeDouble(anyOf("everyday_real", "scientific_real", "everyday_pseudo", "scientific_pseudo")),
    "pseudoword_instruction",
    randomize("dict"),
    "question1",
    "question4",
    "question5",
    SendResults(),
    "confirmation-prolific",
    "end"
    
);

// Ethics agreement: participants must agree before continuing
newTrial("ethics",
    newHtml("ethics.html")
        .cssContainer({
            "margin": "1em"
        })
        .print(),
    newHtml("form", `<div class='fancy'><input name='consent' id='consent' type='checkbox'><label for='consent'>Ich haben den Hinweis gelesen und möchte an der Studie teilnehmen.</label></div>`)
        .cssContainer({
            "margin": "1em"
        })
        .print(),
    newFunction(() => $("#consent").change(e => {
        if (e.target.checked) getButton("go_to_info").enable()._runPromises();
        else getButton("go_to_info").disable()._runPromises();
    })).call(),
    newButton("go_to_info", "Next")
        .cssContainer({
            "margin": "1em"
        })
        .disable()
        .print()
        .wait()
);

// Start the next list as soon as the participant agrees to the ethics statement
SetCounter("setcounter"); //will 

// Worker ID input
newTrial("participants",
    // Automatically print all Text elements, centered
    defaultText.center().print().cssContainer({
        "margin-bottom": "1em"
    }),
    newText("<p>Bitte geben Sie ihre Prolific ID ein:"),
    newTextInput("inputID", "")
        .center()
        .css("margin", "1em")
        .print(),
    newButton("Zu den Anweisungen")
        .center()
        .print()
        .wait(getTextInput("inputID").testNot.text("")),
    // Store the text from inputID into the Var element
    getVar("ID").set(getTextInput("inputID"))
);

// Instructions
newTrial("instructions",
    newHtml("instructions.html")
        .center()
        .cssContainer({
            "margin": "1em"
        })
        .print(),
    newButton("go_to_exercise", "Gehe zu den Übungsgeschichten")
        .cssContainer({
            "margin": "1em"
        })
        .print()
        .wait()
);

// Practice trial
Template("prac_items.csv", row =>
    newTrial("exercise",
        newPrimer(),
        dashed("exercise", row.TEXT),
        getText("exercise")
            .center()
            .log()
            .remove(),
        askExerciseQuestion(row)
    )
        .log("item", row.ITEM)
        .log("condition", row.CONDITION)
);


// Start experiment
newTrial("start_experiment",
    newText("<h2>Nun beginnt das tatsächliche Experiment.</h2><p>Sie werden 8 Geschichten lesen, zu deren Inhalt Sie Ja/Nein-Fragen beantworten müssen.</p>")
        .center()
        .print(),
    newButton("go_to_experiment", "Start")
        .print()
        .wait()
);

// Experimental trial
Template("materials.csv", row =>
    newTrial(
        row.CONDITION,
        newPrimer(),
        dashed("experiment", row.TEXT),
        getText("experiment")
            .center()
            .log()
            .remove(),
        askTrialQuestion(row)
    )
        .log("group", row.GROUP) // Log the group information
        .log("condition", row.CONDITION)
        .log("correct", row.CORRECT) //The accuracy is not being logged here.
        .log("itemID", row.ITEMID) // Log the ITEMID
        .log("targetwordchunk", row.TARGETWORDCHUNK) //log TARGETWORDCHUNK
        .log("associativechunk", row.ASSOCIATIVECHUNK) //log ASSOCIATIVECHUNK
        .log("targetword", row.TARGETWORD)
        .log("associatedword", row.ASSOCIATEDWORD)
        .log("storytopic", row.STORYTOPIC)
);

// Instructions 
newTrial("instructions",
    newHtml("instructions_text", "instructions.html")
        .center()
        .cssContainer({
            "margin": "1em"
        })
        .print(),
    newButton("go_to_exercise", "Gehe zu den Übungsgeschichten.")
        .cssContainer({
            "margin": "1em"
        })
        .print()
        .wait()
);

// Page to display pseudoword instruction
newTrial("pseudoword_instruction",
    newHtml("pseudoword_instruction", "pseudoword_instruction.html")
        .cssContainer({
            "margin": "1em"
        })
        .print(),
    newButton("continue_pseudoword_instruction", "Next")
        .cssContainer({
            "margin": "1em"
        })
        .print()
        .wait()
);

// Targetword questionnaire
Template("Pseudowords.csv", row =>
    newTrial("dict",
        newText("<h2 style='font-weight:bold;margin-bottom:10px;'>Geben Sie Definitionen von max. 1 Satz</h2>")
            .print(),
        newText("instruction", "Bitte geben Sie im untenstehenden Textfeld eine Definition von maximal einem Satz an. <strong>Drücken Sie anschließend die Enter-Taste, um die 'Next'-Taste sichtbar zu machen.</strong>")
            .css({
                "margin": "1em",
                "height": "100px"
            })
            .print(),
        newText("targetword", row.TARGETWORD)
            .css("font-weight", "bold")
            .print(),
        newTextInput("targetword")
            .center()
            .css({
                "margin": "1em",
                "height": "100px" 
            })
            .print()
            .log()
            .wait(getTextInput("targetword").test.text(/\S/)),
            
        newButton("Next")
            .center()
            .print()
            .wait()
    )
    .log("group", row.GROUP)
    .log("targetword", row.TARGETWORD)
);



//Post-Experiment Questions
newTrial("question1",
    newHtml("header", "<h1>Post-Experiment-Fragebogen:</h1>")
        .print(),
    
    newHtml("intro", "<p>Ihnen werden nun 5 Post-Experiment-Fragen präsentiert, die Sie beantworten müssen.</p>") //made change: not 4
        .print(),

    // Question 1
    newHtml("question1", `
        <fieldset>
            <legend>Frage 1:</legend>
            <ol>
                <li>Haben Sie beim Lesen an einer beliebigen Stelle nach unten oder zur Seite gescrollt, um die gesamte Geschichte zu sehen?</li>
                <li>Gab es während des Experiments technische Probleme?</li>
            </ol>
            <label for="antwort1">Ihre Antwort:</label>
            <textarea id="antwort1" name="antwort1" rows="5" cols="50"></textarea>
        </fieldset>
    `).log()
    .print(),

    // Question 2
    newHtml("question2", `
        <fieldset>
            <legend>Frage 2:</legend>
            <ol>
                <li>Was wurde Ihrer Meinung nach mit diesem Experiment getestet?</li>
            </ol>
            <label for="antwort2">Ihre Antwort:</label>
            <textarea id="antwort2" name="antwort2" rows="5" cols="50"></textarea>
        </fieldset>
    `).log()
    .print(),

    // Question 3
    newHtml("question3", `
        <fieldset>
            <legend>Frage 3:</legend>
            <ol>
                <li>Haben Sie sonstiges Feedback zu dem Experiment?</li>
            </ol>
            <label for="antwort3">Ihre Antwort:</label>
            <textarea id="antwort3" name="antwort3" rows="5" cols="50"></textarea>
        </fieldset>
    `).log()
    .print(),

    newButton("Next")
            .center()
            .print()
            .wait()
    
);

// Question 4 
newTrial("question4",
    newHtml("header2", "<h1>Fachkenntnisse:</h1>")
        .settings.css({
            "text-align": "center",
            "font-family": "Arial, sans-serif",
            "margin": "1em"
        })
        .print(),

    newHtml("intro2", "<p>Frage 4: Verfügen Sie über Fachkenntnisse in einem der folgenden Bereiche? Kreuzen Sie diese an, indem Sie das 'X' auf der Tastatur drücken.</p>")
        .settings.css({
            "margin": "0",
            "padding": "1em",
            "border": "1px solid #ccc",
            "border-radius": "5px"
        })
        .print(),

    newHtml("question3Form", `
        <form>
            <fieldset>
                <legend>Frage 4:</legend>
                <p>Verfügen Sie über Fachwissen auf einem der folgenden Gebiete?</p>
                <ul>
                    <li><label for="astrophysics">Astrophysik:</label> <textarea id="astrophysics" name="astrophysics" rows="1" cols="1"></textarea></li>
                    <li><label for="astronomy">Astronomie:</label> <textarea id="astronomy" name="astronomy" rows="1" cols="1"></textarea></li>
                    <li><label for="robotics">Robotik:</label> <textarea id="robotics" name="robotics" rows="1" cols="1"></textarea></li>
                    <li><label for="microbiology">Mikrobiologie:</label> <textarea id="microbiology" name="microbiology" rows="1" cols="1"></textarea></li>
                    <li><label for="biology">Biologie:</label> <textarea id="biology" name="biology" rows="1" cols="1"></textarea></li>
                    <li><label for="botany">Botanik:</label> <textarea id="botany" name="botany" rows="1" cols="1"></textarea></li>
                    <li><label for="entomology">Entomologie:</label> <textarea id="entomology" name="entomology" rows="1" cols="1"></textarea></li>
                    <li><label for="paleontology">Paläontologie:</label> <textarea id="paleontology" name="paleontology" rows="1" cols="1"></textarea></li>
                    <li><label for="chemistry">Chemie:</label> <textarea id="chemistry" name="chemistry" rows="1" cols="1"></textarea></li>
                    <li><label for="pharmacy">Pharmazie:</label> <textarea id="pharmacy" name="pharmacy" rows="1" cols="1"></textarea></li>
                    <li><label for="epidemiology">Epidemiologie:</label> <textarea id="epidemiology" name="epidemiology" rows="1" cols="1"></textarea></li>
                    <li><label for="medicine">Medizin:</label> <textarea id="medicine" name="medicine" rows="1" cols="1"></textarea></li>
                    <li><label for="rheumatology">Rheumatologie:</label> <textarea id="rheumatology" name="rheumatology" rows="1" cols="1"></textarea></li>
                    <li><label for="surgery">Chirurgie:</label> <textarea id="surgery" name="surgery" rows="1" cols="1"></textarea></li>
                    <li><label for="geology">Geologie:</label> <textarea id="geology" name="geology" rows="1" cols="1"></textarea></li>
                    <li><label for="archaeology">Archäologie:</label> <textarea id="archaeology" name="archaeology" rows="1" cols="1"></textarea></li>
                    <li><label for="architecture">Architektur:</label> <textarea id="architecture" name="architecture" rows="1" cols="1"></textarea></li>
                    <li><label for="materialscience">Materialwissenschaften:</label> <textarea id="materialscience" name="materialscience" rows="1" cols="1"></textarea></li>
                    <li><label for="datascience">Datenwissenschaften:</label> <textarea id="datascience" name="datascience" rows="1" cols="1"></textarea></li>
                </ul>
            </fieldset>
        </form>
    `).settings.css({
        "margin": "1em"
    }).log().print(),
    
    newButton("Next")
            .center()
            .print()
            .wait()
    )
   
// Question 5
newTrial("question5",
    newHtml("header2", "<h1>Bildungsgrad: </h1>")
        .print(),
        
    newHtml("question5Form", `
        <form>
            <fieldset>
                <legend>Frage 5:</legend>
                <p>Sind Sie derzeit Student*in? Schreiben Sie ein "X" hinter die richtige Antwort.</p>
                <ul>
                    <li><label for="studentJa">Ja</label> <textarea id="studentJa" name="studentJa" rows="1" cols="1"></textarea></li>
                    <li><label for="studentNein">Nein</label> <textarea id="studentNein" name="studentNein" rows="1" cols="1"></textarea></li>
                </ul>
            </fieldset>
            
            <fieldset>
                <p>Welches Bildungsniveau streben Sie an?</p>
                <textarea rows="4" cols="50"></textarea>
            </fieldset>
            
            <fieldset>
                <p>Welches ist Ihr höchster abgeschlossener Bildungsgrad?</p>
                <ul>
                    <li><label for="ohneAbschluss">ohne Abschluss</label> <textarea id="ohneAbschluss" name="ohneAbschluss" rows="1" cols="1"></textarea></li>
                    <li><label for="abitur">Abitur</label> <textarea id="abitur" name="abitur" rows="1" cols="1"></textarea></li>
                    <li><label for="abgeschlosseneAusbildung">abgeschlossene Ausbildung</label> <textarea id="abgeschlosseneAusbildung" name="abgeschlosseneAusbildung" rows="1" cols="1"></textarea></li>
                    <li><label for="fachhochschulreife">Fachhochschulreife</label> <textarea id="fachhochschulreife" name="fachhochschulreife" rows="1" cols="1"></textarea></li>
                    <li><label for="mittlererSchulabschluss">Mittlerer Schulabschluss</label> <textarea id="mittlererSchulabschluss" name="mittlererSchulabschluss" rows="1" cols="1"></textarea></li>
                    <li><label for="hauptschulabschluss">Hauptschulabschluss</label> <textarea id="hauptschulabschluss" name="hauptschulabschluss" rows="1" cols="1"></textarea></li>
                    <li><label for="bachelorAbschluss">Bachelor-Abschluss (BA/BSc/andere)</label> <textarea id="bachelorAbschluss" name="bachelorAbschluss" rows="1" cols="1"></textarea></li>
                    <li><label for="masterAbschluss">Master-Abschluss (MA/MSc/andere)</label> <textarea id="masterAbschluss" name="masterAbschluss" rows="1" cols="1"></textarea></li>
                    <li><label for="diplomMagister">Diplom/Magister</label> <textarea id="diplomMagister" name="diplomMagister" rows="1" cols="1"></textarea></li>
                    <li><label for="doktorgrad">Doktorgrad (PhD)</label> <textarea id="doktorgrad" name="doktorgrad" rows="1" cols="1"></textarea></li>
                    <li><label for="sonstiges">sonstiges</label> <textarea id="sonstiges" name="sonstiges" rows="1" cols="1"></textarea></li>
                </ul>
            </fieldset>
            
            <fieldset>
                <p>Möchten Sie uns einen Kommentar hinterlassen?</p>
                <textarea rows="4" cols="50"></textarea>
            </fieldset>
        </form>
    `).settings.css({
        "margin": "1em"
    }).log().print(),
    
    newButton("Next")
        .center()
        .print()
        .wait()
);



// Redirection to Prolific
newTrial("confirmation-prolific",
    newText("<p>Das Experiment ist nun erledigt!</p>").center().print(),
    newText("<p><a href=https://app.prolific.com/submissions/complete?cc=CLRJC2D1> Hier geht es zurück zu Prolific.</a></p>") //insert https for ART and Vocab test
        .center()
        .print(),
    newButton("void").wait()
)
.setOption("countsForProgressBar", false);

// end
newTrial("end",
    newHtml("end", "end.html")
        .cssContainer({
            "margin": "1em"
        })
        .print(),
    newButton("void")
        .wait()
);


