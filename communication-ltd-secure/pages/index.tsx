import { GetServerSideProps } from "next";
import { NextApiRequest } from "next";
import { getAuthFromCookie } from "../lib/cookies";

export default function Home() {
  return null; // This page will always redirect
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const userId = getAuthFromCookie(req as NextApiRequest);

  if (userId) {
    // User is logged in - redirect to dashboard
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  // User is not logged in - redirect to login
  return {
    redirect: {
      destination: "/login",
      permanent: false,
    },
  };
};
