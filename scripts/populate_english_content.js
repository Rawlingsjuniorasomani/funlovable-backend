const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../src/db/pool');

const CONTENT = {
    moduleTitle: "Nouns and Pronouns",
    moduleDescription: "This module helps learners understand what nouns and pronouns are, how they are used in sentences, and why they are important.",
    lessons: [
        {
            title: "Lesson 1: What Is a Noun?",
            content: `A noun is a naming word. It is the name of a person, place, animal, or thing.

Examples:
* Person: boy, teacher, mother
* Place: school, house, market
* Animal: dog, cat, cow
* Thing: book, pen, chair

Example Sentences:
* The boy is reading a book.
* My school is big.

### Practice Activity
* Circle the nouns in the sentence: *The girl has a bag.*`,
            quiz: {
                title: "Lesson 1 Quiz: What Is a Noun?",
                questions: [
                    {
                        question: "Which word is a noun?",
                        options: ["run", "happy", "teacher", "quickly"],
                        correct_answer: "teacher"
                    },
                    {
                        question: "A noun is the name of a:",
                        options: ["action", "describing word", "person, place, animal, or thing", "sound"],
                        correct_answer: "person, place, animal, or thing"
                    },
                    {
                        question: "Identify the noun: *The cat is sleeping.*",
                        options: ["The", "cat", "is", "sleeping"],
                        correct_answer: "cat"
                    }
                ]
            }
        },
        {
            title: "Lesson 2: Types of Nouns",
            content: `There are different types of nouns:

1. Common Nouns – general names (girl, city, book)
2. Proper Nouns – special names (Ama, Kumasi, Monday)
3. Collective Nouns – names of groups (team, class, family)

Example Sentences:
* Ama lives in Kumasi.
* Our class is quiet.

### Practice Activity
* Write one common noun and one proper noun.`,
            quiz: {
                title: "Lesson 2 Quiz: Types of Nouns",
                questions: [
                    {
                        question: "Which of the following is a proper noun?",
                        options: ["city", "boy", "Accra", "school"],
                        correct_answer: "Accra"
                    },
                    {
                        question: "Which word is a collective noun?",
                        options: ["teacher", "team", "book", "girl"],
                        correct_answer: "team"
                    },
                    {
                        question: "Choose the correct answer: *Ama lives in ___.*",
                        options: ["Kumasi", "kumasi", "City", "town"],
                        correct_answer: "Kumasi"
                    }
                ]
            }
        },
        {
            title: "Lesson 3: What Is a Pronoun?",
            content: `A pronoun is a word used instead of a noun. Pronouns help us avoid repeating nouns.

Common Pronouns:
I, you, he, she, it, we, they

Example:
* Kofi is my friend. He is kind.

### Practice Activity
* Replace the noun with a pronoun: *The dog is hungry. The dog is barking.*`,
            quiz: {
                title: "Lesson 3 Quiz: What Is a Pronoun?",
                questions: [
                    {
                        question: "What is a pronoun?",
                        options: ["A naming word", "An action word", "A word that replaces a noun", "A describing word"],
                        correct_answer: "A word that replaces a noun"
                    },
                    {
                        question: "Which word is a pronoun?",
                        options: ["book", "Kofi", "he", "chair"],
                        correct_answer: "he"
                    },
                    {
                        question: "Replace the noun: *Ama is my friend. ___ is kind.*",
                        options: ["He", "She", "It", "They"],
                        correct_answer: "She"
                    }
                ]
            }
        },
        {
            title: "Lesson 4: Types of Pronouns",
            content: `Some types of pronouns include:

1. Personal Pronouns – I, you, he, she, it, we, they
2. Possessive Pronouns – my, your, his, her, our, their
3. Reflexive Pronouns – myself, yourself, himself

Example Sentences:
* This is my book.
* She hurt herself.

### Practice Activity
* Choose the correct pronoun: *(She / Her) is my sister.*`,
            quiz: {
                title: "Lesson 4 Quiz: Types of Pronouns",
                questions: [
                    {
                        question: "Which is a possessive pronoun?",
                        options: ["he", "my", "they", "it"],
                        correct_answer: "my"
                    },
                    {
                        question: "Which sentence is correct?",
                        options: ["This is her book.", "This is my book.", "This is she book.", "This is he book."],
                        correct_answer: "This is my book."
                    },
                    {
                        question: "Identify the reflexive pronoun: *He hurt himself.*",
                        options: ["He", "hurt", "himself", "him"],
                        correct_answer: "himself"
                    }
                ]
            }
        },
        {
            title: "Lesson 5: Using Nouns and Pronouns in Sentences",
            content: `Nouns and pronouns work together to make sentences clear and smooth.

Example:
* The teacher is here. She is ready to teach.

Common Mistakes to Avoid:
* Repeating nouns too often
* Using the wrong pronoun

### Practice Activity
* Write two sentences using a noun in the first sentence and a pronoun in the second.`,
            quiz: {
                title: "Lesson 5 Quiz: Using Nouns and Pronouns",
                questions: [
                    {
                        question: "Choose the correct pronoun: *The teacher is here. ___ is ready.*",
                        options: ["it", "they", "she", "them"],
                        correct_answer: "she"
                    },
                    {
                        question: "What should a pronoun replace?",
                        options: ["verb", "adjective", "noun", "sentence"],
                        correct_answer: "noun"
                    },
                    {
                        question: "Correct the sentence: *Ama lost Ama bag.*",
                        options: ["Ama lost she bag.", "Ama lost her bag.", "Ama lost his bag.", "Ama lost it bag."],
                        correct_answer: "Ama lost her bag."
                    }
                ]
            }
        }
    ]
};

async function populateContent() {
    const client = await pool.connect();
    try {
        console.log('🚀 Populating English Content...');

        // 1. Find English Subjects
        const engRes = await client.query("SELECT id FROM subjects WHERE name = 'English Language'");
        if (engRes.rows.length === 0) {
            console.log('❌ No English Language subject found.');
            return;
        }

        for (const sub of engRes.rows) {
            console.log(`Processing subject ID: ${sub.id}`);

            // 2. Find or Create Module
            // Check for existing "Grammar" (from seed) or "Nouns and Pronouns"
            let modId;
            const modCheck = await client.query(
                "SELECT id, title FROM modules WHERE subject_id = $1 AND (title = 'Grammar' OR title = 'Nouns and Pronouns')",
                [sub.id]
            );

            if (modCheck.rows.length > 0) {
                modId = modCheck.rows[0].id;
                console.log(`Updated existing module: ${modCheck.rows[0].title} -> ${CONTENT.moduleTitle}`);
                await client.query("UPDATE modules SET title = $1, description = $2 WHERE id = $3",
                    [CONTENT.moduleTitle, CONTENT.moduleDescription, modId]);
            } else {
                console.log(`Creating new module: ${CONTENT.moduleTitle}`);
                const newMod = await client.query(
                    "INSERT INTO modules (subject_id, title, description, order_index) VALUES ($1, $2, $3, 1) RETURNING id",
                    [sub.id, CONTENT.moduleTitle, CONTENT.moduleDescription]
                );
                modId = newMod.rows[0].id;
            }

            // 3. Clear existing lessons and quizzes for this module to avoid duplicates
            // Quizzes link to module usually? Or linked to subject? Schema said subject_id mainly. 
            // If they link to module_id, we can delete by module_id.
            // Let's delete existing lessons.
            await client.query("DELETE FROM lessons WHERE module_id = $1", [modId]);
            console.log('Cleared old lessons.');

            // Delete old quizzes for this module
            await client.query("DELETE FROM quizzes WHERE module_id = $1", [modId]);
            console.log('Cleared old quizzes.');

            // 4. Create Lessons and Quizzes
            for (let i = 0; i < CONTENT.lessons.length; i++) {
                const lessonData = CONTENT.lessons[i];
                console.log(`Creating Lesson ${i + 1}: ${lessonData.title}`);

                const lesRes = await client.query(
                    "INSERT INTO lessons (module_id, title, content, order_index) VALUES ($1, $2, $3, $4) RETURNING id",
                    [modId, lessonData.title, lessonData.content, i + 1]
                );

                // Create Quiz for this lesson
                if (lessonData.quiz) {
                    console.log(`Creating Quiz: ${lessonData.quiz.title}`);
                    const quizRes = await client.query(
                        "INSERT INTO quizzes (subject_id, module_id, title, description) VALUES ($1, $2, $3, $4) RETURNING id",
                        [sub.id, modId, lessonData.quiz.title, `Quiz for ${lessonData.title}`]
                    );
    // const quizId = quizRes.rows[0].id;

                    // Add Questions
                    for (let j = 0; j < lessonData.quiz.questions.length; j++) {
                        const q = lessonData.quiz.questions[j];
                        await client.query(
                            "INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer, order_index) VALUES ($1, $2, $3, $4, $5)",
                            [quizId, q.question, JSON.stringify(q.options), q.correct_answer, j + 1]
                        );
                    }
                }
            }
        }

        console.log('✅ English Content Populated Successfully!');

    } catch (err) {
        console.error('❌ Failed:', err);
    } finally {
        client.release();
        process.exit();
    }
}

populateContent();
