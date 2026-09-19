<div align="center">
  <img src="https://media.tenor.com/stj1QfW0sRcAAAAM/only-yesterday-ghibli.gif" width="600" alt="Only Yesterday animation">
</div>

# Subtle 🏡

Finding short-term housing as a student intern can mean scrolling through Facebook groups, scattered spreadsheets, and public marketplaces with uncertain listings. Subtle is a student-focused relocation platform for college students moving for internships, co-ops, or summer programs.

The platform brings together a housing marketplace, apartment intelligence, and intern connections to help students find a place to live and meet people nearby. The roadmap below outlines the planned features and development milestones.

## MVP 🏆

- User authentication with .edu verification
- Housing marketplace
  - Create, browse, and search sublease listings
  - Filter listings by location, price, and duration
- Apartment intelligence system
  - Generate a Subtle score using a weighted scoring function
  - Evaluate cost, commute time, public transit availability, and safety indicators
- Intern social graph
  - Discover interns by location, company, university, and shared interests
  - Receive ML-powered intern connection recommendations
  - Send and manage connection requests
- Real-time messaging between users

## Stretch Goals 🚀

- Apartment review system
- Carpool matching for interns commuting to similar locations
- Relocation cost simulator

## Timeline 🗓️

| Week | Frontend Tasks | Backend Tasks |
| --- | --- | --- |
| Week 1 | Discuss roles and tech stack<br>Set up communication, environments, and WhenToMeet<br>Review Git<br>Start low-to-high fidelity UI designs<br>Research Next.js and Tailwind CSS<br>Design the overall user flow | Discuss roles and tech stack<br>Set up PostgreSQL locally or through Supabase<br>Plan the database schema<br>Explore APIs using Postman |
| Week 2 | Review UI design basics<br>Design login, dashboard, housing marketplace, and user profile pages<br>Finish Figma designs by the end of the week | Plan users, listings, messages, connections, and activities tables<br>Set up Auth0 authentication and .edu verification<br>Establish a working database connection |
| Week 3–4 | Build listing creation, marketplace, and listing detail pages<br>Add search and filtering UI | Implement listing CRUD routes for price, location, lease duration, and internship company tags<br>Add image uploads and search functionality |
| Week 5 | Build messaging and conversation pages<br>Add connection request UI | Implement real-time messaging with Supabase Realtime<br>Add conversation management and connection request functionality |
| Week 6–7 | Build the apartment intelligence dashboard<br>Visualize the Subtle score | Integrate Google Maps routes and places data<br>Collect commute times, nearby grocery stores, and transportation options<br>Explore public transportation APIs<br>Build a weighted scoring function for the Subtle score |
| Week 8 | Build the Nearby Interns page and user profile cards<br>Integrate connection requests and recommendations<br>Work on stretch goals if time permits | Implement ML-powered intern recommendations<br>Generate connection recommendations<br>Work on stretch goals if time permits |
| Week 9–10 | Prepare the demo and slides<br>Brainstorm skit or video ideas<br>Practice for Presentation Night 🎉 | Finalize the demo<br>Help prepare slides and presentation materials<br>Practice for Presentation Night 🎉 |

## Tech Stack & Resources 💻

**Frontend**

- [Figma](https://www.figma.com/)
- Next.js + Tailwind CSS
  - [What is React?](https://www.youtube.com/watch?v=Tn6-PIqc4UM)
  - [React Foundations](https://nextjs.org/learn/react-foundations)
  - [Next.js Course](https://nextjs.org/learn)
  - [Next.js Tutorial for Beginners](https://www.youtube.com/watch?v=ZVnjOPwW4ZA)
  - [Next.js in 7 minutes](https://www.youtube.com/watch?v=xnOwOBYaA3w)
  - [Next.js Installation](https://nextjs.org/docs/app/getting-started/installation)
  - [Tailwind CSS Docs](https://tailwindcss.com/docs)

**Backend**

- Frameworks
  - [Node.js](https://nodejs.org/en/)
  - [Node.js Crash Course](https://www.youtube.com/watch?v=xnOwOBYaA3w)
  - [Building APIs with Next.js](https://nextjs.org/blog/building-apis-with-nextjs)
- PostgreSQL + Supabase
  - [Supabase Docs](https://supabase.com/docs)
  - [PostgreSQL tutorial for beginners](https://www.youtube.com/watch?v=SpfIwlAYaKk)
  - [Supabase Auth Resources](https://supabase.com/docs/guides/auth)
  - [Supabase Full Course](https://www.youtube.com/watch?v=kyphLGnSz6Q)
- Authentication
  - [Auth0 Docs](https://auth0.com/docs/get-started) — planned authentication and .edu verification
- Messaging
  - [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- APIs
  - [Google Maps Platform](https://mapsplatform.google.com/lp/maps-apis/) — Routes, Compute Route Matrix, Places, and Geocoding
  - [Crime Data API](https://crimescore.io/crime-data-api/)
  - Public transportation APIs
- Scoring + Recommendations
  - Weighted scoring for apartment intelligence
  - [cosine similarity](https://www.geeksforgeeks.org/dbms/cosine-similarity/)
  - [pgvector](https://github.com/pgvector/pgvector)
  - [PostGIS](https://postgis.net/)

**Full Stack**

- [Next.js + Supabase Setup Guide](https://www.youtube.com/watch?v=6XGvBBDtRfo)

**Developer Tools**

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/en/download)
- [Postman](https://www.postman.com/)
- [VS Code](https://code.visualstudio.com/)

## Roadblocks & Possible Solutions 🚧

- Apartment scoring weights may need refinement
  - Start with initial weights for cost, commute, transit, and safety, then refine them using user feedback
- The housing marketplace needs sufficient listing data
  - Populate the database with realistic sample listings for development and demos
- Recommendations may become too complex
  - Start with a simple recommendation approach and expand as needed
- Team members may fall behind
  - Pair frontend and backend members during integration weeks

## Competitors ⚔️

- **Facebook Housing Groups:** Subtle adds .edu verification, searchable listings, and apartment scores to make finding student housing easier.
- **Ohana:** Subtle goes beyond finding housing by helping interns meet potential roommates and build connections nearby.
- **Urbanbound:** Subtle puts student needs first, bringing short-term housing, commute insights, and intern connections into one place.

## Git Cheatsheet 📓

| Command | What it does |
| --- | --- |
| `git init` | Initialize a Git repository |
| `git clone <repo-url>` | Clone a repository from a URL |
| `git status` | Show the current working tree status |
| `git add <file>` | Stage a file; use `git add .` to stage all changes in the current directory |
| `git commit -m "Descriptive message"` | Commit staged changes with a message |
| `git push` | Push local commits to the remote branch |
| `git log` | View commit history |
| `git branch` | List local branches |
| `git branch <branch-name>` | Create a branch |
| `git checkout <branch-name>` | Switch branches |
| `git checkout -b <branch-name>` | Create and switch to a branch |
| `git merge <branch-name>` | Merge a branch into the current branch |
| `git branch -d <branch-name>` | Delete a merged local branch |
| `git push -u origin <branch-name>` | Push a branch and set its upstream |
| `git pull origin <branch-name>` | Fetch and integrate a remote branch into the current branch |
| `git pull` | Fetch and integrate changes from the upstream branch |
| `git fetch` | Fetch remote changes without merging |
| `git reset --hard HEAD` | Discard uncommitted changes to tracked files |
| `git revert <commit>` | Create a new commit that reverses a commit's changes |

## Conventional Commits ✍️

Use `type: short description` for commit messages. Add an optional scope to show which part of the project changed: `type(scope): short description`.

| Type | When to use it | Example |
| --- | --- | --- |
| `feat` | Add a feature | `feat(listings): add price filters` |
| `fix` | Fix a bug | `fix(auth): handle expired sessions` |
| `docs` | Update documentation | `docs: update setup instructions` |
| `refactor` | Restructure code without changing behavior | `refactor: simplify scoring function` |
| `test` | Add or update tests | `test: cover listing search` |
| `chore` | Maintain tooling or dependencies | `chore: update dependencies` |

For a breaking change, add `!` before the colon, such as `feat(api)!: change listing response format`.

## Team 👥
- Caitlin Ochuwa - 😜✌🏾
- Sunay Shehaan - Project Manager
- Tejas Palukuri - Car Nerd
- Pritikaa Venkatakrishnan - Likes Popsicles 
- Lerich Osay - Industry Mentor