import { useState, useEffect } from "react";
import { ApolloClient, InMemoryCache, createHttpLink, gql } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import "./Project.css";
import GithubRepoCard from "../../components/githubRepoCard/GithubRepoCard";
import Button from "../../components/button/Button";
import { openSource, greeting as defaultGreeting } from "../../portfolio";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";

export default function Projects() {
  const portfolioData = usePortfolioData();
  const githubProfile = portfolioData?.profile?.githubProfile || defaultGreeting.githubProfile;
  const [repo, setrepo] = useState([]);

  useEffect(() => {
    getRepoData();
  }, []);

  function getRepoData() {
    const httpLink = createHttpLink({
      uri: "https://api.github.com/graphql",
    });

    const authLink = setContext((_, { headers }) => ({
      headers: {
        ...headers,
        authorization: `Bearer ${atob(openSource.githubConvertedToken)}`,
      },
    }));

    const client = new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
    });

    client
      .query({
        query: gql`
          {
            repositoryOwner(login: "${openSource.githubUserName}") {
              ... on User {
                pinnedItems(first: 6, types: REPOSITORY) {
                  edges {
                    node {
                      ... on Repository {
                        nameWithOwner
                        description
                        forkCount
                        stargazers {
                          totalCount
                        }
                        url
                        id
                        diskUsage
                        primaryLanguage {
                          name
                          color
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      })
      .then((result) => {
        setrepo(result.data.repositoryOwner.pinnedItems.edges);
      })
      .catch((err) => {
        console.error("GitHub GraphQL error:", err);
      });
  }

  return (
    <div className="main" id="opensource">
      <h1 className="project-title">Open Source Projects</h1>
      <div className="repo-cards-div-main">
        {repo.map((v) => {
          return <GithubRepoCard repo={v} key={v.node.id} />;
        })}
      </div>
      <Button
        text={"More Projects"}
        className="project-button"
        href={githubProfile}
        newTab={true}
      />
    </div>
  );
}
